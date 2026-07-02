# Publishing Options

To refresh NSE data and rebuild the static website, run:

```powershell
python main.py
```

This updates the static browser page in:

```text
docs/
```

## Option 1: Manual Git Push

```powershell
git add docs
git add cache/site_data.json
git commit -m "Update index analysis website"
git push
```

## Option 2: One Command Push

Use this only when `cache/site_data.json` already exists and you want to recopy the static templates without refreshing NSE data.

```powershell
python publish_site.py --push
```

## Option 3: GitHub Actions

The workflow is in `.github/workflows/publish-index-site.yml`. It can run manually or on April 5 and October 5. It refreshes NSE data, computes the analysis JSON, rebuilds the website, and commits `cache/site_data.json` plus `docs/`.

`main.py` is non-interactive and always refreshes TRI data from NSE.

## RBI T-Bill Data

`Auctions of 364-Day Government of India Treasury Bills.xlsx` is required for Sharpe Ratio and Sortino Ratio. Keep this workbook in the repository unless/until the project adds an automated RBI download step.

## GitHub Pages

Settings -> Pages -> Build and deployment -> Deploy from a branch -> Branch: `main`, Folder: `/docs`. With `docs/index.html` committed, the site publishes at:

```text
https://contactme-vasu.github.io/indian-index-funds/
```
