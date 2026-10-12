#!/bin/sh
# Commits every change and pushes it to GitHub.
#   ./upload.sh                      commit message "Update <date>"
#   ./upload.sh "Добавил карты"      your own message
# data/ (accounts, saves), node_modules/ and .test-output/ are never uploaded (.gitignore).
set -e
cd "$(dirname "$0")"

REPO="${BREACHLINE_REPO:-https://github.com/ArtemShamaev/BreachLine.git}"
BRANCH="main"
MESSAGE="${1:-Update $(date '+%Y-%m-%d %H:%M')}"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO"
else
  git remote add origin "$REPO"
fi
git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH"

# Bring in what is already on GitHub, so the push is never rejected.
if git fetch -q origin "$BRANCH" 2>/dev/null; then
  if ! git merge-base HEAD "origin/$BRANCH" >/dev/null 2>&1; then
    # First run: GitHub has its own history (files uploaded through the website) that this folder
    # does not share. Continue from GitHub's history; the files in this folder stay exactly as they are.
    BACKUP="local-backup-$(date '+%Y%m%d-%H%M%S')"
    git branch "$BACKUP"
    echo "Подключаю папку к истории GitHub (старая локальная история сохранена в ветке $BACKUP)."
    git reset -q --mixed "origin/$BRANCH"
    # Files that exist only on GitHub stay there (e.g. Breachline.html) instead of being deleted.
    for f in $(git ls-files --deleted); do
      case "$f" in data/*) ;; *) git checkout -q "origin/$BRANCH" -- "$f" ;; esac
    done
  elif ! git merge-base --is-ancestor "origin/$BRANCH" HEAD; then
    git stash -q --include-untracked 2>/dev/null && STASHED=1 || STASHED=
    git rebase -q "origin/$BRANCH"
    [ -n "$STASHED" ] && git stash pop -q
  fi
  git branch -q --set-upstream-to="origin/$BRANCH" "$BRANCH" 2>/dev/null || true
fi

# Accounts and saves must not be public: stop tracking data/ if it ever got into the repository.
if [ -n "$(git ls-files data)" ]; then
  git rm -r -q --cached data
  echo "Папка data/ (аккаунты и сохранения) убрана из репозитория; на этом компьютере она остаётся."
fi

git add -A
if git diff --cached --quiet; then
  echo "Новых изменений нет — отправляю то, что уже закоммичено."
else
  git commit -q -m "$MESSAGE"
  echo "Коммит: $MESSAGE"
fi

if ! git push -u origin "$BRANCH"; then
  echo
  echo "Не удалось отправить. Скорее всего, нужна авторизация на GitHub:"
  echo "  войдите через «gh auth login» или используйте токен GitHub вместо пароля, затем снова ./upload.sh"
  exit 1
fi
echo "Готово: $REPO"
