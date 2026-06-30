# SPEC

The spec adds a health-check carve-out that contradicts the README's rule.

```entailer
let health = the call is a health-check
health -> ~logged
health & req
```
