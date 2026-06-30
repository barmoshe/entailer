# Logging policy

Some prose a style linter would happily pass. The requirements below cannot all
hold at once, and entailer finds the minimal conflicting subset.

```entailer
let req = the call is a request
let logged = the call is logged
let health = the call is a health-check
req -> logged
```

Later in the document, a second rule block:

```entailer
health -> ~logged
health & req
```
