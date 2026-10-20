(function () {
  var KEY = 'sorteio-numeros:v1';
  var $ = function (id) { return document.getElementById(id); };
  var defaults = { min: '1', max: '100', total: '30', perDraw: '3', rounds: [] };
  var state = load();
  var drawLocked = false;

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.rounds)) return Object.assign({}, defaults, s);
    } catch (e) {}
    return Object.assign({}, defaults);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function int(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }
  function plural(n, a, b) { return n + (n === 1 ? a : b); }
  function formatNumber(n) {
    var max = int(state.max);
    var digits = max === null ? 1 : String(Math.abs(max)).length;
    return (n < 0 ? '-' : '') + String(Math.abs(n)).padStart(digits, '0');
  }

  function updateConfirmedCount() {
    var count = state.rounds.reduce(function (sum, r) {
      return sum + r.nums.filter(function (n) {
        return Array.isArray(r.checked) && r.checked.indexOf(n) !== -1;
      }).length;
    }, 0);
    $('confirmed-count').textContent = plural(count, ' número confirmado', ' números confirmados');
    renderOverview();
  }

  function renderOverview() {
    var groups = { unconfirmed: [], confirmed: [] };
    state.rounds.forEach(function (r) {
      r.nums.forEach(function (n) {
        var checked = Array.isArray(r.checked) && r.checked.indexOf(n) !== -1;
        groups[checked ? 'confirmed' : 'unconfirmed'].push(n);
      });
    });
    Object.keys(groups).forEach(function (group) {
      var nums = groups[group].sort(function (a, b) { return a - b; });
      var list = $(group + '-numbers');
      list.innerHTML = '';
      nums.forEach(function (n) {
        var item = document.createElement('li');
        item.textContent = formatNumber(n);
        list.appendChild(item);
      });
      $(group + '-total').textContent = nums.length;
      $(group + '-empty').hidden = nums.length > 0;
    });
    fitOverview();
  }

  function fitOverview() {
    if (!$('overview').open) return;
    ['unconfirmed', 'confirmed'].forEach(function (group) {
      var list = $(group + '-numbers');
      var low = 8, high = 32;
      while (high - low > 0.5) {
        var size = (low + high) / 2;
        list.style.setProperty('--number-size', size + 'px');
        if (list.scrollHeight > list.clientHeight || list.scrollWidth > list.clientWidth) high = size;
        else low = size;
      }
      list.style.setProperty('--number-size', low + 'px');
    });
  }

  function showError(msg) {
    $('alert').hidden = !msg;
    $('alert-t').textContent = msg || '';
  }

  function downloadCsv() {
    var rows = ['Número,Confirmação'];
    state.rounds.slice().reverse().forEach(function (r) {
      r.nums.forEach(function (n) {
        var checked = Array.isArray(r.checked) && r.checked.indexOf(n) !== -1;
        rows.push(n + ',' + (checked ? 'confirmado' : 'não confirmado'));
      });
    });
    var blob = new Blob(['\uFEFF' + rows.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'numeros-sorteados.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function draw() {
    var min = int(state.min), max = int(state.max), total = int(state.total), per = int(state.perDraw);
    if ([min, max, total, per].some(function (v) { return v === null; })) return showError('Preencha todos os campos com números inteiros.');
    if (min > max) return showError('O mínimo deve ser menor ou igual ao máximo.');
    if (total < 1 || per < 1) return showError('Quantidade a sortear e números por vez devem ser 1 ou mais.');
    var drawn = [].concat.apply([], state.rounds.map(function (r) { return r.nums; }));
    var left = total - drawn.length;
    var count = left > 0 ? Math.min(per, left) : per, range = max - min + 1;
    var rand = function () { return min + Math.floor(Math.random() * range); };
    var nums = [];
    var used = new Set(drawn);
    var inRange = 0;
    used.forEach(function (n) { if (n >= min && n <= max) inRange++; });
    var free = range - inRange;
    if (free <= 0) return showError('Todos os números do intervalo já saíram. Aumente o intervalo ou reinicie.');
    count = Math.min(count, free);
    while (nums.length < count) {
      var n = rand();
      if (!used.has(n)) { used.add(n); nums.push(n); }
    }
    state.rounds.push({ n: state.rounds.length + 1, nums: nums });
    showError('');
    save();
    render();
  }

  function render() {
    var min = int(state.min), max = int(state.max);
    var total = int(state.total) || 0, per = int(state.perDraw) || 1;
    var fmt = formatNumber;
    var drawnCount = state.rounds.reduce(function (a, r) { return a + r.nums.length; }, 0);
    var last = state.rounds[state.rounds.length - 1];
    var wide = window.matchMedia('(min-width:1024px)').matches;

    $('stage').textContent = last ? 'Rodada ' + last.n + ' • último sorteio' : 'Aguardando sorteio';
    $('range').textContent = (wide ? 'Intervalo ' : '') + (min === null ? '–' : min) + ' a ' + (max === null ? '–' : max);

    var k = last ? last.nums.length : 0, bs, bf;
    if (wide) { bs = k <= 3 ? 136 : k <= 6 ? 104 : k <= 12 ? 80 : 64; bf = k <= 3 ? 48 : k <= 6 ? 32 : k <= 12 ? 24 : 20; }
    else { bs = k <= 2 ? 120 : k <= 3 ? 96 : k <= 6 ? 80 : 56; bf = k <= 2 ? 48 : k <= 3 ? 32 : k <= 6 ? 24 : 18; }
    var balls = $('balls');
    balls.style.setProperty('--bs', bs + 'px');
    balls.style.setProperty('--bf', bf + 'px');
    balls.innerHTML = '';
    if (last) last.nums.forEach(function (n) {
      var d = document.createElement('div');
      d.className = 'ball';
      d.textContent = fmt(n);
      balls.appendChild(d);
    });
    balls.hidden = !last;
    $('empty').hidden = !!last;
    $('h-empty').hidden = !!last;

    var remaining = Math.max(total - drawnCount, 0);
    var done = total > 0 && remaining === 0;
    $('count').textContent = drawnCount + ' de ' + total + ' sorteados';
    $('remaining').textContent = done ? 'Meta atingida' : plural(remaining, ' restante', ' restantes').replace(/^\d+ /, remaining + ' ');
    $('bar').setAttribute('aria-valuemax', total);
    $('bar').setAttribute('aria-valuenow', Math.min(drawnCount, Math.max(total, 0)));
    $('fill').style.width = (total > 0 ? Math.min(100, Math.round(drawnCount / total * 100)) : 0) + '%';

    var next = Math.min(per, remaining || per);
    $('draw').disabled = drawLocked;
    $('draw-t').textContent = next === 1 ? 'Sortear 1 número' : 'Sortear ' + next + ' números';

    $('badge').textContent = drawnCount;
    $('download').disabled = drawnCount === 0;
    updateConfirmedCount();
    var list = $('list');
    list.innerHTML = '';
    state.rounds.slice().reverse().forEach(function (r) {
      var li = document.createElement('li');
      var head = document.createElement('div');
      head.className = 'row-between';
      head.innerHTML = '<span class="t"></span><span class="small muted"></span>';
      head.children[0].textContent = 'Rodada ' + r.n;
      head.children[1].textContent = plural(r.nums.length, ' número', ' números');
      var chips = document.createElement('div');
      chips.className = 'chips';
      r.nums.forEach(function (n) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'chip';
        var checked = Array.isArray(r.checked) && r.checked.indexOf(n) !== -1;
        c.classList.toggle('is-checked', checked);
        c.setAttribute('aria-pressed', String(checked));
        c.setAttribute('aria-label', 'Número ' + fmt(n));
        c.innerHTML = '<span></span><svg class="chip-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4 10-10"></path></svg>';
        c.firstChild.textContent = fmt(n);
        c.addEventListener('click', function () {
          if (!Array.isArray(r.checked)) r.checked = [];
          var index = r.checked.indexOf(n);
          if (index === -1) r.checked.push(n);
          else r.checked.splice(index, 1);
          var marked = index === -1;
          c.classList.toggle('is-checked', marked);
          c.setAttribute('aria-pressed', String(marked));
          save();
          updateConfirmedCount();
        });
        chips.appendChild(c);
      });
      li.appendChild(head);
      li.appendChild(chips);
      list.appendChild(li);
    });
  }

  function bind(id, key) {
    var el = $(id);
    el.value = state[key];
    el.addEventListener('input', function () { state[key] = el.value; showError(''); save(); render(); });
  }
  bind('min', 'min'); bind('max', 'max'); bind('total', 'total'); bind('per', 'perDraw');
  $('draw').addEventListener('click', function () {
    if (drawLocked) return;
    drawLocked = true;
    $('draw').disabled = true;
    setTimeout(function () {
      drawLocked = false;
      $('draw').disabled = false;
    }, 200);
    draw();
  });
  $('download').addEventListener('click', downloadCsv);
  $('overview-toggle').addEventListener('click', function () { $('overview').showModal(); fitOverview(); });
  $('overview-close').addEventListener('click', function () { $('overview').close(); });
  $('options-toggle').addEventListener('click', function () {
    var options = $('options');
    options.hidden = !options.hidden;
    $('options-toggle').setAttribute('aria-expanded', String(!options.hidden));
  });
  $('reset').addEventListener('click', function () { $('confirm').showModal(); });
  $('no').addEventListener('click', function () { $('confirm').close(); });
  $('yes').addEventListener('click', function () {
    $('confirm').close();
    state.rounds = []; showError(''); save(); render();
  });
  $('fs').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', function () {
    $('fs-t').textContent = document.fullscreenElement ? 'Sair da tela cheia' : 'Tela cheia';
  });
  window.matchMedia('(min-width:1024px)').addEventListener('change', render);
  window.addEventListener('resize', fitOverview);
  render();
})();
