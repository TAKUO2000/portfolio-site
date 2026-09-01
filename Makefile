.PHONY: dev setup docker-up docker-down migrate test

dev:
	@trap 'kill 0' INT; \
	(cd laravel-back && php artisan serve) & \
	(cd nextjs-front && npm run dev) & \
	wait

# 既存ファイルは壊さずに、足りない.envだけ雛形からコピーする
setup:
	@for dir in . laravel-back nextjs-front; do \
		if [ ! -f $$dir/.env ]; then \
			cp $$dir/.env.example $$dir/.env; \
			echo "created $$dir/.env"; \
		fi; \
	done

docker-up: setup
	docker compose up -d --build

docker-down:
	docker compose down

migrate:
	docker compose exec app php artisan migrate

# テストは専用DBを使う。既存のmysql volumeには初期化スクリプトが走らないため、
# 同じスクリプトを冪等に実行してからテストする
test:
	@docker compose exec -T mysql sh /docker-entrypoint-initdb.d/10-create-testing-database.sh
	docker compose exec app php artisan test
