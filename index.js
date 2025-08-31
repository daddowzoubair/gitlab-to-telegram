const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '7385654536:AAH-4uOaT4uK56BAesDxydJZc5ju7h6uapc';
const TELEGRAM_CHAT_ID = '-4890664705';
const GITLAB_BASE_URL = 'https://gitlab.tikram-group.com/';

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
        const { user_username, project, commits, ref, total_commits_count } = req.body;
        const repoLink = `<a href="${GITLAB_BASE_URL}${project.path_with_namespace}">${project.name}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${user_username}">${user_username}</a>`;
        const branchName = ref.split('/').pop();
        message += `📦 <b>Push Event</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 User: ${userLink}\n🌿 Branch: <b>${branchName}</b>\n📊 Total Commits: ${total_commits_count || commits.length}\n\n`;
        
        if (commits && commits.length > 0) {
          message += `📝 Recent Commits:\n`;
          const commitsToShow = commits.slice(0, 5); // Show max 5 commits
          for (const commit of commitsToShow) {
            const shortMessage = commit.message.length > 50 ? commit.message.substring(0, 50) + '...' : commit.message;
            message += `🔸 <a href="${commit.url}">${shortMessage}</a>\n`;
          }
          if (commits.length > 5) {
            message += `... and ${commits.length - 5} more commits`;
          }
        }
        break;
      }

      case 'tag_push': {
        const { ref, user_name, project } = req.body;
        const tagName = ref.split('/').pop();
        const repoLink = `<a href="${GITLAB_BASE_URL}${project.path_with_namespace}">${project.name}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${user_name}">${user_name}</a>`;
        message += `🏷 <b>Tag Event</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 User: ${userLink}\n🏷 Tag: <b>${tagName}</b>`;
        break;
      }

      case 'merge_request': {
        const mr = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const mrLink = `<a href="${mr.url}">${mr.title}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>`;
        const sourceBranch = mr.source_branch;
        const targetBranch = mr.target_branch;
        
        let actionEmoji = '🔀';
        if (mr.action === 'open') actionEmoji = '🆕';
        else if (mr.action === 'close') actionEmoji = '❌';
        else if (mr.action === 'merge') actionEmoji = '✅';
        else if (mr.action === 'reopen') actionEmoji = '🔄';
        else if (mr.action === 'update') actionEmoji = '📝';
        
        message += `${actionEmoji} <b>Merge Request ${mr.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n📋 Title: ${mrLink}\n🌿 Source: <b>${sourceBranch}</b> → <b>${targetBranch}</b>\n📊 State: ${mr.state}`;
        break;
      }

      case 'issue': {
        const issue = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const issueLink = `<a href="${issue.url}">${issue.title}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>`;
        
        let actionEmoji = '📌';
        if (issue.action === 'open') actionEmoji = '🆕';
        else if (issue.action === 'close') actionEmoji = '❌';
        else if (issue.action === 'reopen') actionEmoji = '🔄';
        else if (issue.action === 'update') actionEmoji = '📝';
        
        message += `${actionEmoji} <b>Issue ${issue.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n📋 Title: ${issueLink}\n📊 State: ${issue.state}`;
        
        if (issue.labels && issue.labels.length > 0) {
          message += `\n🏷 Labels: ${issue.labels.join(', ')}`;
        }
        break;
      }

      case 'note': {
        const note = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>`;
        
        let noteType = 'Comment';
        let noteEmoji = '💬';
        
        if (note.noteable_type === 'MergeRequest') {
          noteType = 'MR Comment';
          noteEmoji = '🔀';
        } else if (note.noteable_type === 'Issue') {
          noteType = 'Issue Comment';
          noteEmoji = '📌';
        } else if (note.noteable_type === 'Commit') {
          noteType = 'Commit Comment';
          noteEmoji = '📝';
        } else if (note.noteable_type === 'Snippet') {
          noteType = 'Snippet Comment';
          noteEmoji = '📄';
        }
        
        const shortNote = note.note.length > 100 ? note.note.substring(0, 100) + '...' : note.note;
        message += `${noteEmoji} <b>${noteType}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n💭 Comment: ${shortNote}\n🔗 <a href="${note.url}">View Comment</a>`;
        break;
      }

      case 'pipeline': {
        const pipeline = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const pipelineLink = `<a href="${pipeline.url}">Pipeline #${pipeline.id}</a>`;
        const userLink = req.body.user ? `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>` : 'System';
        
        let statusEmoji = '⚙️';
        if (pipeline.status === 'success') statusEmoji = '✅';
        else if (pipeline.status === 'failed') statusEmoji = '❌';
        else if (pipeline.status === 'running') statusEmoji = '🔄';
        else if (pipeline.status === 'canceled') statusEmoji = '⏹️';
        else if (pipeline.status === 'skipped') statusEmoji = '⏭️';
        
        message += `${statusEmoji} <b>Pipeline ${pipeline.status.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Triggered by: ${userLink}\n🔗 ${pipelineLink}\n🌿 Branch: ${pipeline.ref}`;
        break;
      }

      case 'job': {
        const job = req.body;
        const repoLink = `<a href="${GITLAB_BASE_URL}${job.project.path_with_namespace}">${job.project.name}</a>`;
        const jobLink = `<a href="${job.build_url}">${job.build_name}</a>`;
        
        let statusEmoji = '⚙️';
        if (job.build_status === 'success') statusEmoji = '✅';
        else if (job.build_status === 'failed') statusEmoji = '❌';
        else if (job.build_status === 'running') statusEmoji = '🔄';
        else if (job.build_status === 'canceled') statusEmoji = '⏹️';
        else if (job.build_status === 'skipped') statusEmoji = '⏭️';
        
        message += `${statusEmoji} <b>Job ${job.build_status.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n🔧 Job: ${jobLink}\n🌿 Branch: ${job.ref}`;
        break;
      }

      case 'deployment': {
        const deployment = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = req.body.user ? `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>` : 'System';
        
        let statusEmoji = '🚀';
        if (deployment.status === 'success') statusEmoji = '✅';
        else if (deployment.status === 'failed') statusEmoji = '❌';
        else if (deployment.status === 'running') statusEmoji = '🔄';
        else if (deployment.status === 'canceled') statusEmoji = '⏹️';
        
        message += `${statusEmoji} <b>Deployment ${deployment.status.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Deployed by: ${userLink}\n🌍 Environment: ${deployment.environment}\n🌿 Branch: ${deployment.ref}`;
        break;
      }

      case 'wiki_page': {
        const wiki = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>`;
        
        let actionEmoji = '📚';
        if (wiki.action === 'create') actionEmoji = '🆕';
        else if (wiki.action === 'update') actionEmoji = '📝';
        else if (wiki.action === 'delete') actionEmoji = '🗑️';
        
        message += `${actionEmoji} <b>Wiki Page ${wiki.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n📄 Page: ${wiki.title}\n🔗 <a href="${wiki.url}">View Page</a>`;
        break;
      }

      case 'release': {
        const release = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = req.body.user ? `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>` : 'System';
        
        let actionEmoji = '🎉';
        if (release.action === 'create') actionEmoji = '🆕';
        else if (release.action === 'update') actionEmoji = '📝';
        else if (release.action === 'delete') actionEmoji = '🗑️';
        
        message += `${actionEmoji} <b>Release ${release.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n🏷 Tag: ${release.tag}\n📋 Name: ${release.name}\n🔗 <a href="${release.url}">View Release</a>`;
        break;
      }

      case 'milestone': {
        const milestone = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = req.body.user ? `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>` : 'System';
        
        let actionEmoji = '🎯';
        if (milestone.action === 'create') actionEmoji = '🆕';
        else if (milestone.action === 'update') actionEmoji = '📝';
        else if (milestone.action === 'close') actionEmoji = '✅';
        else if (milestone.action === 'reopen') actionEmoji = '🔄';
        else if (milestone.action === 'delete') actionEmoji = '🗑️';
        
        message += `${actionEmoji} <b>Milestone ${milestone.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n🎯 Title: ${milestone.title}\n📊 State: ${milestone.state}`;
        break;
      }

      case 'feature_flag': {
        const flag = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = req.body.user ? `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>` : 'System';
        
        let statusEmoji = flag.active ? '🟢' : '🔴';
        message += `${statusEmoji} <b>Feature Flag ${flag.active ? 'ENABLED' : 'DISABLED'}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 User: ${userLink}\n🚩 Flag: ${flag.name}\n📝 Description: ${flag.description || 'No description'}`;
        break;
      }

      case 'work_item': {
        const workItem = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = req.body.user ? `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>` : 'System';
        
        let actionEmoji = '📋';
        if (workItem.action === 'create') actionEmoji = '🆕';
        else if (workItem.action === 'update') actionEmoji = '📝';
        else if (workItem.action === 'close') actionEmoji = '✅';
        else if (workItem.action === 'reopen') actionEmoji = '🔄';
        
        message += `${actionEmoji} <b>Work Item ${workItem.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 Author: ${userLink}\n📋 Title: ${workItem.title}\n📊 State: ${workItem.state}`;
        break;
      }

      case 'emoji': {
        const emoji = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        const userLink = `<a href="${GITLAB_BASE_URL}${req.body.user.username}">${req.body.user.username}</a>`;
        
        let actionEmoji = emoji.action === 'award' ? '👍' : '👎';
        message += `${actionEmoji} <b>Emoji ${emoji.action.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n👨🏻‍💻 User: ${userLink}\n😀 Emoji: ${emoji.name}\n🔗 <a href="${emoji.awarded_on_url}">View</a>`;
        break;
      }

      case 'access_token': {
        const token = req.body.object_attributes;
        const repoLink = req.body.project ? `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>` : 
                        req.body.group ? `<a href="${GITLAB_BASE_URL}${req.body.group.group_path}">${req.body.group.group_name}</a>` : 'Unknown';
        
        message += `🔑 <b>Access Token Expiring</b>\n📁 ${req.body.project ? 'Repository' : 'Group'}: ${repoLink}\n🔑 Token: ${token.name}\n⏰ Expires: ${token.expires_at}`;
        break;
      }

      case 'vulnerability': {
        const vuln = req.body.object_attributes;
        const repoLink = `<a href="${GITLAB_BASE_URL}${req.body.project.path_with_namespace}">${req.body.project.name}</a>`;
        
        let severityEmoji = '⚠️';
        if (vuln.severity === 'critical') severityEmoji = '🚨';
        else if (vuln.severity === 'high') severityEmoji = '🔴';
        else if (vuln.severity === 'medium') severityEmoji = '🟡';
        else if (vuln.severity === 'low') severityEmoji = '🟢';
        
        message += `${severityEmoji} <b>Vulnerability ${vuln.state.toUpperCase()}</b>\n📁 Repository: ${repoLink}\n🚨 Title: ${vuln.title}\n📊 Severity: ${vuln.severity.toUpperCase()}\n🔗 <a href="${vuln.url}">View Details</a>`;
        break;
      }

      // Group-specific events
      case 'group_member': {
        const member = req.body.object_attributes;
        const groupLink = `<a href="${GITLAB_BASE_URL}${req.body.group.group_path}">${req.body.group.group_name}</a>`;
        
        let actionEmoji = '👥';
        if (member.action === 'create') actionEmoji = '➕';
        else if (member.action === 'update') actionEmoji = '📝';
        else if (member.action === 'destroy') actionEmoji = '➖';
        
        message += `${actionEmoji} <b>Group Member ${member.action.toUpperCase()}</b>\n👥 Group: ${groupLink}\n👤 User: ${member.user_name}\n🔑 Access Level: ${member.access_level}`;
        break;
      }

      case 'project': {
        const project = req.body.object_attributes;
        const groupLink = req.body.group ? `<a href="${GITLAB_BASE_URL}${req.body.group.group_path}">${req.body.group.group_name}</a>` : 'No group';
        
        let actionEmoji = '📁';
        if (project.action === 'create') actionEmoji = '🆕';
        else if (project.action === 'destroy') actionEmoji = '🗑️';
        
        message += `${actionEmoji} <b>Project ${project.action.toUpperCase()}</b>\n👥 Group: ${groupLink}\n📁 Project: ${project.name}\n🔗 <a href="${project.url}">View Project</a>`;
        break;
      }

      case 'subgroup': {
        const subgroup = req.body.object_attributes;
        const groupLink = req.body.group ? `<a href="${GITLAB_BASE_URL}${req.body.group.group_path}">${req.body.group.group_name}</a>` : 'No parent group';
        
        let actionEmoji = '📂';
        if (subgroup.action === 'create') actionEmoji = '🆕';
        else if (subgroup.action === 'destroy') actionEmoji = '🗑️';
        
        message += `${actionEmoji} <b>Subgroup ${subgroup.action.toUpperCase()}</b>\n👥 Parent Group: ${groupLink}\n📂 Subgroup: ${subgroup.name}`;
        break;
      }

      default:
        message += `🤷‍♂️ Unhandled event type: <b>${object_kind}</b>\n📋 Event data available but not yet implemented`;
        break;
    }

    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });

    res.status(200).send('Message sent to Telegram');
  } catch (error) {
    console.error('Error processing webhook:', error.response?.data || error.message);
    res.status(500).send('Failed to send message');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});