pnpm i
pnpm run dist
git add .

DATE_STR=$(date +%Y-%m-%d_%H-%M-%S)
git commit -m "Update dist $DATE_STR"
hp git push