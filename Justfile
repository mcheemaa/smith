host := env("SMITH_HOST", "")
remote := "/home/smith/smith"

# Sync this checkout to the box, install dependencies, restart the service.
deploy target=host:
    rsync -az --delete --rsync-path="sudo rsync" --chown=smith:smith --exclude node_modules --exclude .git --exclude local --exclude .env.local ./ {{target}}:{{remote}}/
    ssh {{target}} 'cd {{remote}} && sudo -u smith /home/smith/.bun/bin/bun install --frozen-lockfile && sudo systemctl restart smith'

# Copy the local .env.local to the box.
env target=host:
    scp .env.local {{target}}:/tmp/smith.env
    ssh {{target}} 'sudo install -o smith -g smith -m 600 /tmp/smith.env {{remote}}/.env.local && rm /tmp/smith.env'

logs target=host:
    ssh -t {{target}} 'sudo journalctl -fu smith -o cat'

status target=host:
    ssh {{target}} 'sudo systemctl status smith --no-pager'
