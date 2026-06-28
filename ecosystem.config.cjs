/** PM2 ecosystem — Shylv Manager Bot Discord. windowsHide = no console flash. */
module.exports = {
  apps: [
    {
      name: 'Shylv Manager Bot Discord',
      script: 'bun',
      args: 'run src/index.ts',
      cwd: 'D:/Shylv Projects/Dev/Bot/Shylv Manager Bot Discord',
      windowsHide: true,
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      restart_delay: 5000,
      error_file: 'C:/Users/Agung Prasetyo/AppData/Local/hermes/logs/shylv-manager-bot-error.log',
      out_file: 'C:/Users/Agung Prasetyo/AppData/Local/hermes/logs/shylv-manager-bot-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
