pnpm i
pnpm run dist
git add .

DATE_STR=$(date +%Y-%m-%d_%H-%M-%S)
git commit -m "Update dist $DATE_STR"
export https_proxy=http://localhost:7890; export http_proxy=http://localhost:7890
git push