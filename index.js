const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '7385654536:AAH-4uOaT4uK56BAesDxydJZc5ju7h6uapc';
const TELEGRAM_CHAT_ID = '@670048444';

const app = express();
app.use(bodyParser.json());

app.post('/gitlab-webhook', async (req, res) => {
  const { object_kind, user_username, project, commits } = req.body;

  let message = `🧠 <b>GitLab Update</b>\nProject: ${project.name}\nUser: ${user_username}`;

  if (object_kind === 'push') {
    message += `\nCommits:\n`;
    for (const commit of commits) {
      message += `🔸 <a href="${commit.url}">${commit.message}</a>\n`;
    }
  }

  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });
    res.status(200).send('Message sent to Telegram');
  } catch (error) {
    console.error(error);
    res.status(500).send('Failed to send message');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});