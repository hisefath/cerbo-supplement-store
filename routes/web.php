<?php

use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\OrderController;
use App\Http\Middleware\ActingProvider;
use App\Models\Provider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Provider side (inside the EHR). Auth is stubbed by ActingProvider.
Route::middleware(ActingProvider::class)->group(function () {
    Route::redirect('/', '/dashboard');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('/inventory/{product}', [DashboardController::class, 'adjustStock'])->name('inventory.adjust');
    Route::get('/orders/new', [OrderController::class, 'create'])->name('orders.create');
    Route::post('/orders/preview', [OrderController::class, 'preview'])->name('orders.preview');
    Route::post('/orders', [OrderController::class, 'store'])->name('orders.store');
    Route::get('/orders/{id}', [OrderController::class, 'show'])->where('id', '[0-9]{1,18}')->name('orders.show');
    Route::post('/orders/{id}/cancel', [OrderController::class, 'cancel'])->where('id', '[0-9]{1,18}')->name('orders.cancel');
    Route::get('/platform', [DashboardController::class, 'platform'])->name('platform');
});

// Stubbed login: switch which demo provider you are acting as.
Route::post('/act-as', function (Request $request) {
    $request->session()->put('provider_id', Provider::findOrFail($request->integer('provider_id'))->id);

    return redirect()->route('dashboard');
})->name('act-as');

// Patient side: capability link only.
Route::get('/pay/{token}', [CheckoutController::class, 'show'])->name('checkout.show');
Route::post('/pay/{token}', [CheckoutController::class, 'pay'])->middleware('throttle:20,1')->name('checkout.pay');
