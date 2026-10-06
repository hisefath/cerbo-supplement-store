<?php

use App\Models\Order;
use App\Models\Product;
use App\Services\Ledger;
use Illuminate\Support\Facades\Artisan;

Artisan::command('ledger:verify', function () {
    $failures = Ledger::verifyAll();
    foreach ($failures as $failure) {
        $this->error($failure);
    }
    if ($failures) {
        return 1;
    }
    $this->info(sprintf(
        'OK: %d orders audited (%d paid) reconcile to the cent; stock matches movements for %d products.',
        Order::count(), Order::where('status', Order::PAID)->count(), Product::count(),
    ));

    return 0;
})->purpose("Re-verify every order's split, payment and ledger, and every product's stock");
