<?php

namespace App\Services;

use RuntimeException;

/** An expected reason an order action can't happen right now (already paid, cancelled, out of stock). */
final class OrderException extends RuntimeException {}
