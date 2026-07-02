# Website Export

This folder contains the code and static templates used by `main.py` and `publish_site.py`.

The files generated for the public website are written to:

```text
docs/
```

That folder is published via GitHub Pages (Settings -> Pages -> Deploy from a branch -> main -> /docs), so the site is available at the repository's Pages root, e.g. `https://contactme-vasu.github.io/indian-index-funds/`.

`main.py` computes the public analysis data directly from the downloaded TRI cache and writes:

```text
cache/site_data.json
docs/data.json
```

The public JSON contains only the analysis-table fields shown on the website, not raw TRI values or per-window rolling-return arrays.
