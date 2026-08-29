.PHONY: dev docker-up docker-down migrate

dev:
	@trap 'kill 0' INT; \
	(cd laravel-back && php artisan serve) & \
	(cd nextjs-front && npm run dev) & \
	wait

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

migrate:
	docker compose exec app php artisan migrate
