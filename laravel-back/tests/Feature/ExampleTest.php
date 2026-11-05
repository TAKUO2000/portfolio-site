<?php

test('トップページはバージョンなどの情報を返さない', function () {
    $this->get('/')->assertNotFound();
});
