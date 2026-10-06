<?php

namespace App\Http\Middleware;

use App\Models\Provider;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;

/**
 * Auth seam (stubbed). Resolves "who is the provider" from the session; the real version would
 * read the EHR's authenticated session or SSO. Everything downstream only asks for the provider,
 * so authorization (scoping every query to it) is real even though authentication is not.
 */
class ActingProvider
{
    public function handle(Request $request, Closure $next)
    {
        $provider = Provider::find($request->session()->get('provider_id')) ?? Provider::orderBy('id')->firstOrFail();

        $request->attributes->set('provider', $provider);
        View::share('actingProvider', $provider);
        View::share('allProviders', Provider::orderBy('id')->get());

        return $next($request);
    }
}
