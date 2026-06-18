.PHONY: dev

dev:
	@trap 'kill 0' INT; \
	(cd laravel-back && php artisan serve) & \
	(cd nextjs-front && npm run dev) & \
	wait
