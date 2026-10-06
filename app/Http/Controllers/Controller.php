<?php

namespace App\Http\Controllers;

use App\Models\Provider;
use Illuminate\Http\Request;

abstract class Controller
{
    /** The provider resolved by the ActingProvider middleware. */
    protected function provider(Request $request): Provider
    {
        return $request->attributes->get('provider');
    }
}
