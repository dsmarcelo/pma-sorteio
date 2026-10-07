(function () {
  var KEY = 'sorteio-numeros:v1';
  var $ = function (id) { return document.getElementById(id); };
  var defaults = { min: '1', max: '100', total: '30', perDraw: '3', rounds: [] };
  var state = load();

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

  function showError(msg) {
    $('alert').hidden = !msg;
    $('alert-t').textContent = msg || '';
  }

  function draw() {
    var min = int(state.min), max = int(state.max), total = int(state.total), per = int(state.perDraw);
    if ([min, max, total, per].some(function (v) { return v === null; })) return showError('Preencha todos os campos com números inteiros.');
    if (min > max) return showError('O mínimo deve ser menor ou igual ao máximo.');
    if (total < 1 || per < 1) return showError('Quantidade a sortear e números por vez devem ser 1 ou mais.');
    var drawn = [].concat.apply([], state.rounds.map(function (r) { return r.nums; }));
    var left = total - drawn.length;
    if (left <= 0) return showError('A quantidade definida já foi sorteada. Reinicie para um novo sorteio.');
    var count = Math.min(per, left), range = max - min + 1;
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
    var fmt = String;
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
    $('remaining').textContent = done ? (wide ? 'Sorteio concluído' : 'Concluído') : plural(remaining, ' restante', ' restantes').replace(/^\d+ /, remaining + ' ');
    $('bar').setAttribute('aria-valuemax', total);
    $('bar').setAttribute('aria-valuenow', drawnCount);
    $('fill').style.width = (total > 0 ? Math.min(100, Math.round(drawnCount / total * 100)) : 0) + '%';

    var next = Math.min(per, remaining || per);
    $('draw').disabled = done;
    $('draw-t').textContent = done ? 'Sorteio concluído' : (next === 1 ? 'Sortear 1 número' : 'Sortear ' + next + ' números');

    $('badge').textContent = drawnCount;
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
        var c = document.createElement('span');
        c.className = 'chip';
        c.textContent = fmt(n);
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
  $('draw').addEventListener('click', draw);
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
  render();
})();
