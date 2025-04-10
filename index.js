const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '7385654536:AAH-4uOaT4uK56BAesDxydJZc5ju7h6uapc';
const TELEGRAM_CHAT_ID = '670048444';

const app = express();
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Webhook Telegram service is running!');
});

app.post('/gitlab-webhook', async (req, res) => {
  const { object_kind } = req.body;
  let message = `❗️ <b>GitLab Event</b>\n`;

  try {
    switch (object_kind) {
      case 'push': {
        const { user_username, project, commits } = req.body;
        const repoLink = `<a href="${project.web_url}">${project.name}</a>`;
        const userLink = `<a href="https://gitlab.com/${user_username}">${user_username}</a>`;
        message += `📦 <b>Push Event</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 User: ${userLink}\nCommits:\n`;
        for (const commit of commits) {
          message += `🔸 <a href="${commit.url}">${commit.message}</a>\n`;
        }
        break;
      }

      case 'merge_request': {
        const mr = req.body.object_attributes;
        const repoLink = `<a href="${req.body.project.web_url}">${req.body.project.name}</a>`;
        const mrLink = `<a href="${mr.url}">${mr.title}</a>`;
        const userLink = `<a href="https://gitlab.com/${req.body.user.username}">${req.body.user.username}</a>`;
        message += `🔀 <b>Merge Request</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\nTitle: ${mrLink}\nState: ${mr.state}`;
        break;
      }

      case 'issue': {
        const issue = req.body.object_attributes;
        const repoLink = `<a href="${req.body.project.web_url}">${req.body.project.name}</a>`;
        const issueLink = `<a href="${issue.url}">${issue.title}</a>`;
        const userLink = `<a href="https://gitlab.com/${req.body.user.username}">${req.body.user.username}</a>`;
        message += `📌 <b>Issue</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\nIssue: ${issueLink}\nAction: ${issue.action}`;
        break;
      }

      case 'note': {
        const note = req.body.object_attributes;
        const repoLink = `<a href="${req.body.project.web_url}">${req.body.project.name}</a>`;
        const userLink = `<a href="https://gitlab.com/${req.body.user.username}">${req.body.user.username}</a>`;
        message += `💬 <b>Comment</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\nNote: ${note.note}\n<a href="${note.url}">View Comment</a>`;
        break;
      }

      case 'tag_push': {
        const { ref, user_name, project } = req.body;
        const tagName = ref.split('/').pop();
        const repoLink = `<a href="${project.web_url}">${project.name}</a>`;
        const userLink = `<a href="https://gitlab.com/${user_name}">${user_name}</a>`;
        message += `🏷 <b>New Tag</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 User: ${userLink}\nTag: <b>${tagName}</b>`;
        break;
      }

      default:
        message += `🤷‍♂️ Unhandled event type: <b>${object_kind}</b>`;
        break;
    }

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });

    res.status(200).send('Message sent to Telegram');
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send('Failed to send message');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});