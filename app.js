const metaEl = document.querySelector('[data-meta]');
const recordsEl = document.querySelector('[data-records]');
const recapsEl = document.querySelector('[data-recaps]');
const standingsEl = document.querySelector('[data-standings]');

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const formatDate = (value) => {
  if (!value) return 'Date TBD';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const parseRecord = (record) => {
  if (!record) return { wins: 0, losses: 0 };
  if (typeof record === 'string') {
    const [wins, losses] = record.split('-').map((value) => Number.parseInt(value, 10));
    return {
      wins: Number.isFinite(wins) ? wins : 0,
      losses: Number.isFinite(losses) ? losses : 0,
    };
  }
  return {
    wins: record.wins || 0,
    losses: record.losses || 0,
  };
};

const getStandings = (data) => {
  if (Array.isArray(data.standings) && data.standings.length) {
    return data.standings.map((row) => {
      const parsed = parseRecord(row.record || row);
      const wins = row.wins ?? parsed.wins;
      const losses = row.losses ?? parsed.losses;
      return {
        player: row.player,
        wins,
        losses,
        games: wins + losses,
      };
    });
  }

  const stats = new Map();
  const addPlayer = (name) => {
    if (!stats.has(name)) {
      stats.set(name, { player: name, wins: 0, losses: 0, games: 0 });
    }
  };

  data.players.forEach(addPlayer);

  data.weeks.forEach((week) => {
    const participants = week.players && week.players.length ? week.players : data.players;
    const winners = toArray(week.winner);

    participants.forEach((name) => {
      addPlayer(name);
      stats.get(name).games += 1;
      if (winners.includes(name)) {
        stats.get(name).wins += 1;
      } else {
        stats.get(name).losses += 1;
      }
    });
  });

  return Array.from(stats.values());
};

const sortStandings = (standings) => standings
  .slice()
  .sort((a, b) => a.player.localeCompare(b.player));

const renderRecords = (standings) => {
  if (!recordsEl) return;
  recordsEl.innerHTML = standings
    .map((record) => {
      const winRate = record.games ? Math.round((record.wins / record.games) * 100) : 0;
      return `
        <article class="record-card">
          <h3>${record.player}</h3>
          <div class="record-stats">
            <div class="stat-line"><span>Games</span><strong>${record.games}</strong></div>
            <div class="stat-line"><span>Wins</span><strong>${record.wins}</strong></div>
            <div class="stat-line"><span>Losses</span><strong>${record.losses}</strong></div>
            <div class="stat-line"><span>Win Rate</span><strong>${winRate}%</strong></div>
          </div>
        </article>
      `;
    })
    .join('');
};

const renderStandings = (standings) => {
  if (!standingsEl) return;
  standingsEl.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Player</th>
          <th>Record</th>
          <th>Wins</th>
          <th>Losses</th>
          <th>Games</th>
        </tr>
      </thead>
      <tbody>
        ${standings
          .map((row) => `
            <tr>
              <td>${row.player}</td>
              <td>${row.wins}-${row.losses}</td>
              <td>${row.wins}</td>
              <td>${row.losses}</td>
              <td>${row.games}</td>
            </tr>
          `)
          .join('')}
      </tbody>
    </table>
  `;
};

const renderRecaps = (weeks) => {
  if (!recapsEl) return;
  if (!weeks.length) {
    recapsEl.innerHTML = '<article class="recap-card"><h3>No games yet</h3><p>Add your first week in <code>data.json</code>.</p></article>';
    return;
  }

  recapsEl.innerHTML = weeks
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((week) => {
      const winners = toArray(week.winner).join(', ') || 'TBD';
      const last = toArray(week.lastPlace).join(', ') || 'TBD';
      const bestPlayer = toArray(week.bestPlayer).join(', ') || '';
      const bestPlayBy = toArray(week.bestPlayBy).join(', ') || '';
      const worstPlayBy = toArray(week.worstPlayBy).join(', ') || '';
      const bestPlay = week.bestPlay || '';
      const worstPlay = week.worstPlay || 'Add the worst play for this match.';
      const summary = week.summary || '';
      const summaryParts = summary.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

      return `
        <article class="recap-card">
          <h3>${formatDate(week.date)}</h3>
          <div class="recap-meta">
            <span class="tag winner">Winner: ${winners}</span>
            <span class="tag last">Last Place: ${last}</span>
            ${bestPlayer ? `<span class="tag best">Best Player: ${bestPlayer}</span>` : ''}
            ${bestPlayBy ? `<span class="tag bestplay">Best Play: ${bestPlayBy}</span>` : ''}
            ${worstPlayBy ? `<span class="tag worstplay">Worst Play: ${worstPlayBy}</span>` : ''}
          </div>
          ${summaryParts.map((part) => `<p class="recap-summary">${part}</p>`).join('')}
          ${bestPlay ? `<p class="best-play"><strong>Best Play:</strong> ${bestPlay}</p>` : ''}
          <p class="worst-play"><strong>Worst Play:</strong> ${worstPlay}</p>
        </article>
      `;
    })
    .join('');
};

fetch('data.json')
  .then((response) => response.json())
  .then((data) => {
    if (metaEl) {
      metaEl.textContent = `${data.leagueName} | ${data.seasonYear}`;
    }
    const standings = sortStandings(getStandings(data));
    renderRecords(standings);
    renderStandings(standings);
    renderRecaps(data.weeks || []);
  })
  .catch(() => {
    if (metaEl) {
      metaEl.textContent = 'Unable to load data.json';
    }
  });
