/**
 * The human-facing logic DSL ↔ Formula AST.
 *
 * Accepts both Unicode and ASCII spellings of every connective so the same text
 * can come from a keyboard, an LLM, or a copy-pasted spec. The inverse direction
 * is {@link formulaToString} (the AST's canonical Unicode rendering).
 *
 * Grammar (precedence tight → loose):
 *   iff      ::= implies ( ('↔'|'<->'|'<=>') implies )*      // left-assoc
 *   implies  ::= or ( ('→'|'->'|'=>') implies )?             // right-assoc
 *   or       ::= and ( ('∨'|'|'|'\/') and )*                 // left-assoc
 *   and      ::= unary ( ('∧'|'&'|'/\') unary )*             // left-assoc
 *   unary    ::= ('¬'|'~'|'!') unary | primary
 *   primary  ::= '(' iff ')' | '⊤'|'true' | '⊥'|'false' | predicate | atom
 *   predicate::= ident '(' term (',' term)* ')'
 *   term     ::= ident '(' term (',' term)* ')' | ident
 *
 * A bare identifier in formula position is an {@link Atom}; an identifier applied
 * to arguments is a {@link Pred}. Inside a term, an identifier is a constant
 * (0-ary func), an applied identifier a function term, and an identifier that the
 * caller declared a variable... is not distinguishable lexically here — every
 * bare term identifier parses as a constant. (Variables enter via the AST
 * constructors / FOL input, which v0.1 treats as out-of-fragment anyway.)
 */
import {
  and,
  atom,
  bottom,
  cst,
  fn,
  formulaToString,
  iff,
  implies,
  not,
  or,
  pred,
  top,
  type Formula,
  type Term,
} from "./ast.js";

/** A parse failure carrying the 0-based column where the scanner gave up. */
export class ParseError extends Error {
  readonly column: number;
  constructor(message: string, column: number) {
    super(`${message} (col ${column})`);
    this.name = "ParseError";
    this.column = column;
  }
}

// ---- Tokenizer ------------------------------------------------------------

type TokKind =
  | "not"
  | "and"
  | "or"
  | "implies"
  | "iff"
  | "lparen"
  | "rparen"
  | "comma"
  | "top"
  | "bottom"
  | "ident"
  | "eof";

interface Token {
  readonly kind: TokKind;
  readonly text: string;
  readonly col: number;
}

const IDENT_START = /[A-Za-z]/;
const IDENT_REST = /[A-Za-z0-9_]/;

/** Multi-char operator spellings, longest first so `<->` beats `<`. */
const OPERATORS: ReadonlyArray<readonly [string, TokKind]> = [
  ["<->", "iff"],
  ["<=>", "iff"],
  ["->", "implies"],
  ["=>", "implies"],
  ["/\\", "and"],
  ["\\/", "or"],
  ["↔", "iff"],
  ["→", "implies"],
  ["∧", "and"],
  ["∨", "or"],
  ["¬", "not"],
  ["~", "not"],
  ["!", "not"],
  ["&", "and"],
  ["|", "or"],
  ["⊤", "top"],
  ["⊥", "bottom"],
  ["(", "lparen"],
  [")", "rparen"],
  [",", "comma"],
];

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i]!;
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    let matched = false;
    for (const [spelling, kind] of OPERATORS) {
      if (input.startsWith(spelling, i)) {
        tokens.push({ kind, text: spelling, col: i });
        i += spelling.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (IDENT_START.test(ch)) {
      const start = i;
      i++;
      while (i < input.length && IDENT_REST.test(input[i]!)) i++;
      const text = input.slice(start, i);
      const lowered = text.toLowerCase();
      if (lowered === "true") tokens.push({ kind: "top", text, col: start });
      else if (lowered === "false") tokens.push({ kind: "bottom", text, col: start });
      else tokens.push({ kind: "ident", text, col: start });
      continue;
    }

    throw new ParseError(`Unexpected character '${ch}'`, i);
  }
  tokens.push({ kind: "eof", text: "", col: input.length });
  return tokens;
}

// ---- Recursive-descent parser ---------------------------------------------

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos]!;
  }
  private next(): Token {
    return this.tokens[this.pos++]!;
  }
  private expect(kind: TokKind, what: string): Token {
    const t = this.peek();
    if (t.kind !== kind) throw new ParseError(`Expected ${what}`, t.col);
    return this.next();
  }

  parse(): Formula {
    const f = this.parseIff();
    const t = this.peek();
    if (t.kind !== "eof") throw new ParseError(`Unexpected '${t.text}'`, t.col);
    return f;
  }

  private parseIff(): Formula {
    let left = this.parseImplies();
    while (this.peek().kind === "iff") {
      this.next();
      left = iff(left, this.parseImplies());
    }
    return left;
  }

  private parseImplies(): Formula {
    const left = this.parseOr();
    if (this.peek().kind === "implies") {
      this.next();
      return implies(left, this.parseImplies()); // right-associative
    }
    return left;
  }

  private parseOr(): Formula {
    let left = this.parseAnd();
    while (this.peek().kind === "or") {
      this.next();
      left = or(left, this.parseAnd());
    }
    return left;
  }

  private parseAnd(): Formula {
    let left = this.parseUnary();
    while (this.peek().kind === "and") {
      this.next();
      left = and(left, this.parseUnary());
    }
    return left;
  }

  private parseUnary(): Formula {
    if (this.peek().kind === "not") {
      this.next();
      return not(this.parseUnary());
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Formula {
    const t = this.peek();
    switch (t.kind) {
      case "lparen": {
        this.next();
        const inner = this.parseIff();
        this.expect("rparen", "')'");
        return inner;
      }
      case "top":
        this.next();
        return top;
      case "bottom":
        this.next();
        return bottom;
      case "ident": {
        this.next();
        if (this.peek().kind === "lparen") {
          const args = this.parseArgList();
          return pred(t.text, args);
        }
        return atom(t.text);
      }
      default:
        throw new ParseError(`Expected a formula, found '${t.text || "<eof>"}'`, t.col);
    }
  }

  private parseArgList(): Term[] {
    this.expect("lparen", "'('");
    const args: Term[] = [this.parseTerm()];
    while (this.peek().kind === "comma") {
      this.next();
      args.push(this.parseTerm());
    }
    this.expect("rparen", "')'");
    return args;
  }

  private parseTerm(): Term {
    const t = this.expect("ident", "a term");
    if (this.peek().kind === "lparen") {
      const args = this.parseArgList();
      return fn(t.text, args);
    }
    return cst(t.text);
  }
}

/** Parse the logic DSL into a {@link Formula}. Throws {@link ParseError} on bad input. */
export function parse(input: string): Formula {
  return new Parser(tokenize(input)).parse();
}

/** Convenience inverse — the AST's canonical Unicode rendering. */
export { formulaToString };
