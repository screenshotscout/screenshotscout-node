# Examples

Install the dependencies and build the SDK from the repository root:

```sh
npm install
npm run build
```

Set `SCREENSHOTSCOUT_ACCESS_KEY`, then run an example:

```sh
npm exec tsx -- examples/binary.ts
npm exec tsx -- examples/json.ts
```

Set `SCREENSHOTSCOUT_SECRET_KEY` as well when signed requests are enabled for the API key.
