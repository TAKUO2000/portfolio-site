<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// 未使用画像の回収。アクセスの少ない時間帯に1日1回、多重起動しないように実行する
Schedule::command('images:prune')
    ->dailyAt('04:00')
    ->withoutOverlapping();
