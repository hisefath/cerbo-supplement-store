<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="csrf-token" content="{{ csrf_token() }}">
<title>@yield('title', 'Supplement Store') · Cerbo partner slice</title>
<style>
  :root { --fg:#1f2933; --muted:#616e7c; --line:#e4e7eb; --bg:#f6f7f9; --card:#fff; --accent:#2f6f5e; --bad:#b42318; --good:#067647; }
  * { box-sizing:border-box; }
  body { margin:0; font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--fg); background:var(--bg); }
  header { background:#fff; border-bottom:1px solid var(--line); padding:10px 24px; display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
  header .brand { font-weight:700; }
  header nav a { margin-right:14px; color:var(--fg); text-decoration:none; }
  header nav a.active { color:var(--accent); font-weight:600; }
  header form { margin-left:auto; }
  main { max-width:1120px; margin:24px auto; padding:0 16px; }
  h1 { font-size:22px; margin:0 0 16px; } h2 { font-size:17px; margin:0 0 10px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:16px 20px; margin-bottom:20px; overflow-x:auto; }
  table { width:100%; border-collapse:collapse; }
  th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); vertical-align:middle; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); font-weight:600; }
  .num { text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
  tr.total td { font-weight:700; border-top:2px solid var(--fg); }
  .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:20px; }
  .kpi { background:#fff; border:1px solid var(--line); border-radius:8px; padding:12px 14px; }
  .kpi .v { font-size:22px; font-weight:700; font-variant-numeric:tabular-nums; } .kpi .l { color:var(--muted); font-size:13px; }
  .flash { padding:10px 14px; border-radius:6px; margin-bottom:16px; }
  .flash.ok { background:#ecfdf3; color:var(--good); } .flash.err { background:#fef3f2; color:var(--bad); }
  .badge { padding:2px 8px; border-radius:99px; font-size:12px; background:#eef2f6; white-space:nowrap; }
  .badge.paid { background:#ecfdf3; color:var(--good); } .badge.awaiting_payment { background:#fffaeb; color:#b54708; } .badge.processing { background:#eff8ff; color:#175cd3; } .badge.cancelled { background:#f2f4f7; color:#475467; }
  button, .btn { background:var(--accent); color:#fff; border:0; border-radius:6px; padding:8px 14px; font:inherit; cursor:pointer; text-decoration:none; display:inline-block; }
  button.secondary { background:#fff; color:var(--fg); border:1px solid #cbd2d9; }
  button.small { padding:4px 10px; font-size:13px; }
  input, select { font:inherit; padding:6px 8px; border:1px solid #cbd2d9; border-radius:6px; background:#fff; }
  input[type=number] { width:78px; } input.price { width:96px; }
  .muted { color:var(--muted); font-size:13px; } .good { color:var(--good); } .bad { color:var(--bad); }
  .stub { font-size:13px; background:#fffaeb; color:#93370d; border:1px dashed #fec84b; padding:6px 10px; border-radius:6px; display:inline-block; }
  code { font-size:12px; background:#f2f4f7; padding:1px 4px; border-radius:4px; }
</style>
</head>
<body>
@isset($actingProvider)
<header>
  <span class="brand">Supplement Store</span>
  <nav>
    <a href="{{ route('dashboard') }}" @class(['active' => request()->routeIs('dashboard')])>Dashboard</a>
    <a href="{{ route('orders.create') }}" @class(['active' => request()->routeIs('orders.create')])>New order</a>
    <a href="{{ route('platform') }}" @class(['active' => request()->routeIs('platform')])>Platform metrics</a>
  </nav>
  <form method="post" action="{{ route('act-as') }}">
    @csrf
    <label class="muted">Acting as <span class="stub">stubbed login</span>
      <select name="provider_id" onchange="this.form.submit()">
        @foreach ($allProviders as $p)
          <option value="{{ $p->id }}" @selected($p->id === $actingProvider->id)>{{ $p->name }}</option>
        @endforeach
      </select>
    </label>
    <noscript><button class="small">Switch</button></noscript>
  </form>
</header>
@endisset
<main>
  @if (session('status'))<div class="flash ok">{{ session('status') }}</div>@endif
  @if (session('error'))<div class="flash err">{{ session('error') }}</div>@endif
  @if ($errors->any())<div class="flash err">@foreach ($errors->all() as $message)<div>{{ $message }}</div>@endforeach</div>@endif
  @yield('content')
</main>
</body>
</html>
