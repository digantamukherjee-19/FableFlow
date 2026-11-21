/**
 * FableFlow Community Lounges, Group Chat Demo & Writing Challenges
 * Manages guild discovery, community posts, discussions, and local chat interactions.
 */

window.FableFlow = window.FableFlow || {};

FableFlow.Community = (function() {
  const GUILDS_KEY = 'fableflow_guilds';
  const MEMBERSHIPS_KEY = 'fableflow_memberships';
  const CHAT_KEY = 'fableflow_chat_messages';
  const POSTS_KEY = 'fableflow_discussion_posts';

  let activeGuildId = 'comm_fantasy';
  let activeTab = 'chat';

  function escapeHtml(value) {
    return FableFlow.Backend?.escapeHtml ? FableFlow.Backend.escapeHtml(value) : String(value ?? '');
  }

  function init() {
    bindEvents();
  }

  function initDefaultData() {
    if (!localStorage.getItem(GUILDS_KEY)) {
      const defaultGuilds = [
        {
          id: 'comm_fantasy',
          name: 'Fantasy Worldbuilders',
          genre: 'Fantasy',
          description: 'For novelists shaping intricate magic systems, high epic adventures, and legendary creatures.',
          coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
          memberCount: 3840
        },
        {
          id: 'comm_scifi',
          name: 'Cyberpunk & Sci-Fi Forge',
          genre: 'Science Fiction',
          description: 'Hard sci-fi, space opera, cyberpunk aesthetics, and AI co-writing discussions.',
          coverImage: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80',
          memberCount: 2610
        },
        {
          id: 'comm_romance',
          name: 'The Romance Guild',
          genre: 'Romance',
          description: 'Enemies-to-lovers, slow burns, cozy fiction, and romantic dialogue workshops.',
          coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          memberCount: 5200
        },
        {
          id: 'comm_writers_block',
          name: 'The Midnight Quill Cafe',
          genre: 'Writing Advice',
          description: 'Overcoming writer’s block, sprint marathons, writing accountability, and daily creative prompts.',
          coverImage: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80',
          memberCount: 6150
        }
      ];
      localStorage.setItem(GUILDS_KEY, JSON.stringify(defaultGuilds));
    }

    if (!localStorage.getItem(CHAT_KEY)) {
      const defaultChat = [
        {
          id: 'm1',
          guildId: 'comm_fantasy',
          username: 'ElenaVance',
          content: 'Welcome everyone to the Fantasy Worldbuilders lounge! Today we are discussing hard vs soft magic limits.',
          time: '10:14 AM'
        },
        {
          id: 'm2',
          guildId: 'comm_fantasy',
          username: 'MarcusSterling',
          content: 'Limitations make characters work harder for their victories. Boundless magic kills tension.',
          time: '10:18 AM'
        }
      ];
      localStorage.setItem(CHAT_KEY, JSON.stringify(defaultChat));
    }

    if (!localStorage.getItem(POSTS_KEY)) {
      const defaultPosts = [
        {
          id: 'p1',
          author: 'Elena Vance',
          title: 'How do you balance high magical stakes with quiet character moments?',
          content: 'I find that slowing down during campfire scenes lets readers emotionally catch up with big battles.',
          likes: 42,
          commentsCount: 16
        },
        {
          id: 'p2',
          author: 'Marcus Sterling',
          title: 'Speculative tech: What if synthetic memories could be forged into glass currency?',
          content: 'A currency where you literally trade your happiest childhood day for a week of rations.',
          likes: 31,
          commentsCount: 9
        }
      ];
      localStorage.setItem(POSTS_KEY, JSON.stringify(defaultPosts));
    }
  }

  function getGuilds() {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getGuilds();
    return JSON.parse(localStorage.getItem(GUILDS_KEY) || '[]');
  }

  function getMemberships() {
    if (FableFlow.Backend?.isReady()) return FableFlow.Backend.getMemberships();
    return JSON.parse(localStorage.getItem(MEMBERSHIPS_KEY) || '["comm_fantasy"]');
  }

  function isMember(guildId) {
    return getMemberships().includes(guildId);
  }

  function toggleJoinGuild(guildId) {
    if (window.FableFlow.Auth && !window.FableFlow.Auth.requireAuth('join community guilds', () => actuallyToggleJoinGuild(guildId))) {
      return;
    }
    actuallyToggleJoinGuild(guildId);
  }

  function actuallyToggleJoinGuild(guildId) {
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.toggleMembership(guildId).then(render).catch(error => console.error('Could not update guild membership', error));
      return;
    }
    let list = getMemberships();
    if (list.includes(guildId)) {
      list = list.filter(id => id !== guildId);
    } else {
      list.push(guildId);
    }
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(list));
    render();
  }

  function render() {
    const guilds = getGuilds();
    const activeGuild = guilds.find(g => g.id === activeGuildId) || guilds[0];

    // 1. Render Guilds List
    const listEl = document.getElementById('community-guilds-list');
    if (listEl) {
      listEl.innerHTML = guilds.map(g => {
        const active = g.id === activeGuild.id;
        const joined = isMember(g.id);
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-radius: 8px; border: 1px solid ${active ? 'var(--color-primary)' : 'var(--border-color)'}; background: ${active ? 'var(--bg-card)' : 'var(--bg-elevated)'}; margin-bottom: 8px; cursor: pointer;"
               onclick="FableFlow.Community.selectGuild('${g.id}')">
            <div>
              <span style="font-size: 0.68rem; font-weight: 800; color: var(--color-primary);">${escapeHtml(g.genre)}</span>
              <h4 style="font-size: 0.88rem; font-weight: 800; margin-top: 2px;">${escapeHtml(g.name)}</h4>
              <p style="font-size: 0.72rem; color: var(--text-muted);">${(g.memberCount).toLocaleString()} members</p>
            </div>
            <span style="font-size: 0.75rem; font-weight: 700; color: ${joined ? 'var(--color-primary)' : 'var(--text-muted)'};">
              ${joined ? '✓ Joined' : '+ Join'}
            </span>
          </div>
        `;
      }).join('');
    }

    // 2. Render Active Guild Header
    const titleEl = document.getElementById('community-active-title');
    const descEl = document.getElementById('community-active-desc');
    const joinBtn = document.getElementById('community-join-btn');

    if (titleEl) titleEl.textContent = activeGuild.name;
    if (descEl) descEl.textContent = activeGuild.description;
    if (joinBtn) {
      const joined = isMember(activeGuild.id);
      joinBtn.textContent = joined ? 'Leave Guild' : 'Join Guild';
      joinBtn.className = joined ? 'btn-secondary' : 'btn-primary';
      joinBtn.onclick = () => toggleJoinGuild(activeGuild.id);
    }

    // 3. Render Active Tab Content
    if (activeTab === 'chat') {
      renderChat(activeGuild.id);
    } else if (activeTab === 'challenges') {
      renderChallenges();
    } else {
      renderDiscussions();
    }
  }

  function selectGuild(id) {
    activeGuildId = id;
    render();
  }

  function setSubTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.community-subtab-btn').forEach(b => {
      if (b.getAttribute('data-subtab') === tab) {
        b.style.background = 'var(--color-secondary)';
        b.style.color = 'var(--color-primary)';
      } else {
        b.style.background = 'var(--bg-card)';
        b.style.color = 'var(--text-muted)';
      }
    });

    const chatPane = document.getElementById('community-pane-chat');
    const chalPane = document.getElementById('community-pane-challenges');
    const discPane = document.getElementById('community-pane-discussions');

    if (chatPane) chatPane.style.display = tab === 'chat' ? 'block' : 'none';
    if (chalPane) chalPane.style.display = tab === 'challenges' ? 'block' : 'none';
    if (discPane) discPane.style.display = tab === 'discussions' ? 'block' : 'none';

    render();
  }

  function renderChat(guildId) {
    const guildMsgs = FableFlow.Backend?.isReady()
      ? FableFlow.Backend.getGuildMessages(guildId)
      : JSON.parse(localStorage.getItem(CHAT_KEY) || '[]').filter(m => m.guildId === guildId);
    const box = document.getElementById('community-chat-messages');
    if (!box) return;

    const user = FableFlow.Auth.getCurrentUser();
    const myName = user ? user.username : 'You';

    box.innerHTML = guildMsgs.map(m => {
      const isMine = m.username === myName;
      return `
        <div class="chat-bubble ${isMine ? 'mine' : 'theirs'}">
          <div style="font-size: 0.65rem; font-weight: 800; opacity: 0.8; margin-bottom: 2px;">
            ${escapeHtml(m.username)} • ${escapeHtml(m.time)}
          </div>
          <p>${escapeHtml(m.content)}</p>
        </div>
      `;
    }).join('');

    box.scrollTop = box.scrollHeight;
  }

  function sendChatMessage(text) {
    if (!text.trim()) return;
    if (window.FableFlow.Auth && !window.FableFlow.Auth.requireAuth('send chat messages in community lounges', () => actuallySendChatMessage(text))) {
      return;
    }
    actuallySendChatMessage(text);
  }

  function actuallySendChatMessage(text) {
    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.sendMessage(activeGuildId, text.trim())
        .then(() => renderChat(activeGuildId))
        .catch(error => console.error('Could not send community message', error));
      return;
    }
    const user = FableFlow.Auth.getCurrentUser();
    const username = user ? user.username : 'Guest_' + Math.floor(Math.random() * 899 + 100);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg = {
      id: `m_${Date.now()}`,
      guildId: activeGuildId,
      username,
      content: text.trim(),
      time: timeStr
    };

    const all = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]');
    all.push(newMsg);
    localStorage.setItem(CHAT_KEY, JSON.stringify(all));

    renderChat(activeGuildId);

    // Simulate friendly author reply after 1.5s
    setTimeout(() => {
      const companionReplies = [
        "That's a fantastic thought! In chapter 3 I tried something similar.",
        "Totally agreed! Sensory details really bring that home.",
        "Great writing insight. Thank you for sharing in the guild lounge!"
      ];
      const replyMsg = {
        id: `m_${Date.now()}_rep`,
        guildId: activeGuildId,
        username: 'ElenaVance',
        content: companionReplies[Math.floor(Math.random() * companionReplies.length)],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      all.push(replyMsg);
      localStorage.setItem(CHAT_KEY, JSON.stringify(all));
      renderChat(activeGuildId);
    }, 1200);
  }

  function renderChallenges() {
    const box = document.getElementById('community-pane-challenges');
    if (!box) return;

    if (FableFlow.Backend?.isReady()) {
      const challenges = FableFlow.Backend.getChallenges();
      const joinedIds = new Set(FableFlow.Backend.getChallengeIds());
      box.innerHTML = `<div style="display: flex; flex-direction: column; gap: 16px;">${challenges.map(challenge => {
        const joined = joinedIds.has(challenge.id);
        const daysLeft = challenge.endsAt ? Math.max(0, Math.ceil((new Date(challenge.endsAt) - Date.now()) / 86400000)) : null;
        return `
          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 12px;">
              <strong style="font-size: 0.95rem;">⚡ ${escapeHtml(challenge.title)}</strong>
              ${daysLeft !== null ? `<span style="font-size: 0.72rem; color: var(--color-accent); font-weight: 700;">⏳ ${daysLeft} days left</span>` : ''}
            </div>
            <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); background: var(--bg-card); border: 1.5px solid var(--border-color); padding: 12px; border-radius: 8px;">${escapeHtml(challenge.prompt)}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">${Number(challenge.participantCount || 0).toLocaleString()} authors participating</span>
              <button class="btn-primary" onclick="FableFlow.Community.acceptChallenge('${challenge.id}')">${joined ? '✓ Joined' : 'Accept Challenge'}</button>
            </div>
          </div>`;
      }).join('')}</div>`;
      return;
    }

    box.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 0.95rem;">⚡ 500-Word Midnight Prompt: The Singing Relic</strong>
            <span style="font-size: 0.72rem; color: var(--color-accent); font-weight: 700;">⏳ 3 days left</span>
          </div>
          <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); background: var(--bg-card); border: 1.5px solid var(--border-color); padding: 12px; border-radius: 8px;">
            "Your protagonist discovers an ancient artifact that hums whenever someone tells a lie in its presence. Write a 500-word scene at a royal banquet."
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">142 authors participating</span>
            <button class="btn-primary" onclick="FableFlow.Community.acceptChallenge('The Singing Relic')">Accept Challenge</button>
          </div>
        </div>

        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <strong style="font-size: 0.95rem;">💬 Dialogue-Only Flash Fiction: The Train Delayed</strong>
            <span style="font-size: 0.72rem; color: var(--color-accent); font-weight: 700;">⏳ 5 days left</span>
          </div>
          <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-muted); background: var(--bg-card); border: 1.5px solid var(--border-color); padding: 12px; border-radius: 8px;">
            "Two former rivals find themselves trapped on a delayed midnight commuter train. Tell their entire history and reconciliation using only dialogue."
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">89 authors participating</span>
            <button class="btn-primary" onclick="FableFlow.Community.acceptChallenge('The Train Delayed')">Accept Challenge</button>
          </div>
        </div>
      </div>
    `;
  }

  function acceptChallenge(challengeId) {
    if (window.FableFlow.Auth && !window.FableFlow.Auth.requireAuth('participate in writing challenges', () => actuallyAcceptChallenge(challengeId))) return;
    actuallyAcceptChallenge(challengeId);
  }

  async function actuallyAcceptChallenge(challengeId) {
    if (FableFlow.Backend?.isReady()) {
      try {
        const added = await FableFlow.Backend.acceptChallenge(challengeId);
        if (added) alert('Challenge accepted! Head to the Writing Studio to draft your entry.');
        renderChallenges();
      } catch (error) {
        console.error('Could not accept challenge', error);
      }
      return;
    }
    alert(`Challenge accepted for "${challengeId}"! Head to the Writing Studio to draft your entry.`);
  }

  function renderDiscussions() {
    const box = document.getElementById('community-pane-discussions');
    if (!box) return;

    const posts = FableFlow.Backend?.isReady()
      ? FableFlow.Backend.getDiscussionPosts()
      : JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
    const likedPosts = FableFlow.Backend?.isReady() ? new Set(FableFlow.Backend.getDiscussionLikes()) : new Set();

    box.innerHTML = `
      <form onsubmit="event.preventDefault(); FableFlow.Community.addDiscussionPost();" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
        <input type="text" id="community-newpost-title" class="search-input" placeholder="Discussion title / topic..." required />
        <textarea id="community-newpost-content" class="search-input" style="height: 70px; resize: none;" placeholder="Share your perspective or ask advice..." required></textarea>
        <button type="submit" class="btn-primary" style="align-self: flex-end;">Post Discussion</button>
      </form>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${posts.map(p => `
          <div class="card" style="padding: 16px;">
            <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(p.author)}</span>
            <h4 style="font-size: 0.95rem; font-weight: 800; margin: 4px 0;">${escapeHtml(p.title)}</h4>
            <p style="font-size: 0.82rem; line-height: 1.4; color: var(--text-main);">${escapeHtml(p.content)}</p>
            <div style="display: flex; gap: 16px; font-size: 0.75rem; color: var(--text-muted); margin-top: 10px;">
              <span style="cursor: pointer;" onclick="FableFlow.Community.likePost('${p.id}')">${likedPosts.has(p.id) ? '💜' : '❤️'} ${p.likes} likes</span>
              <span>💬 ${p.commentsCount} replies</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function addDiscussionPost() {
    if (window.FableFlow.Auth && !window.FableFlow.Auth.requireAuth('post discussion topics', () => actuallyAddDiscussionPost())) {
      return;
    }
    actuallyAddDiscussionPost();
  }

  function actuallyAddDiscussionPost() {
    const titleInput = document.getElementById('community-newpost-title');
    const contentInput = document.getElementById('community-newpost-content');
    if (!titleInput || !contentInput || !titleInput.value.trim() || !contentInput.value.trim()) return;

    if (FableFlow.Backend?.isReady()) {
      FableFlow.Backend.addDiscussion(titleInput.value.trim(), contentInput.value.trim())
        .then(() => {
          titleInput.value = '';
          contentInput.value = '';
          renderDiscussions();
        })
        .catch(error => console.error('Could not post discussion', error));
      return;
    }

    const user = FableFlow.Auth.getCurrentUser();
    const newPost = {
      id: `p_${Date.now()}`,
      author: user ? user.username : 'Storyteller',
      title: titleInput.value.trim(),
      content: contentInput.value.trim(),
      likes: 1,
      commentsCount: 0
    };

    const posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
    posts.unshift(newPost);
    localStorage.setItem(POSTS_KEY, JSON.stringify(posts));

    titleInput.value = '';
    contentInput.value = '';
    renderDiscussions();
  }

  function likePost(id) {
    if (FableFlow.Backend?.isReady()) {
      if (!FableFlow.Auth?.isRegisteredUser()) {
        FableFlow.Auth?.showGuestPrompt('like community discussions');
        return;
      }
      FableFlow.Backend.toggleDiscussionLike(id)
        .then(renderDiscussions)
        .catch(error => console.error('Could not update discussion like', error));
      return;
    }
    const posts = JSON.parse(localStorage.getItem(POSTS_KEY) || '[]');
    const p = posts.find(item => item.id === id);
    if (p) {
      p.likes = (p.likes || 0) + 1;
      localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
      renderDiscussions();
    }
  }

  function bindEvents() {
    const chatForm = document.getElementById('community-chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('community-chat-input');
        if (input && input.value.trim()) {
          sendChatMessage(input.value);
          input.value = '';
        }
      });
    }
  }

  return {
    init,
    render,
    selectGuild,
    setSubTab,
    addDiscussionPost,
    likePost,
    acceptChallenge
  };
})();
