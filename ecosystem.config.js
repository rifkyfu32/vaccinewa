module.exports = {
  apps : [{
    name: 'vaccinewa',
    script: 'index.js',
    env: {
      "NODE_ENV": "production",
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    ignore_watch : ["node_modules", "session", "session.json"],
  }],
};
