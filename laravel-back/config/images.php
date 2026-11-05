<?php

return [

    /*
    |--------------------------------------------------------------------------
    | 未使用画像の保持期間
    |--------------------------------------------------------------------------
    |
    | images:prune が「まだ消してはいけない」と判断する猶予。
    |
    | - deleted_article_retention_days:
    |     論理削除された記事の画像を残す日数。記事を誤って削除した場合、この期間内に
    |     復元すれば画像も元通りになる。
    |
    | - orphan_grace_hours:
    |     アップロード（本置き場への移動）直後のオブジェクトを対象外にする時間。
    |     記事の保存処理がまだ完了していないオブジェクトを消さないための安全域。
    |
    */

    'deleted_article_retention_days' => (int) env('IMAGE_DELETED_ARTICLE_RETENTION_DAYS', 30),

    'orphan_grace_hours' => (int) env('IMAGE_ORPHAN_GRACE_HOURS', 24),

];
