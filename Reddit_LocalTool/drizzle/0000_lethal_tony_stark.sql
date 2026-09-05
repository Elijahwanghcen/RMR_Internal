CREATE TABLE `ai_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`property_id` text,
	`output` text,
	`model` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `aliases` (
	`alias_norm` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `app_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text,
	`raw_building` text NOT NULL,
	`rating` integer NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_ratings_property` ON `app_ratings` (`property_id`);--> statement-breakpoint
CREATE TABLE `boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `google_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`rating` integer,
	`author` text,
	`relative_time` text,
	`text` text
);
--> statement-breakpoint
CREATE INDEX `idx_greviews_property` ON `google_reviews` (`property_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`unit_label` text,
	`beds` integer,
	`baths` real,
	`sqft` integer,
	`base_rent` real,
	`total_price_with_fees` real,
	`price_basis` text,
	`price_status` text,
	`availability` text,
	`lease_term` text,
	`occupancy` text,
	`concessions_raw` text,
	`concessions_type` text,
	`concessions_value` real,
	`layout_image_url` text,
	`price_image_url` text,
	`price_display` text,
	`layout_display` text,
	`sqft_display` text,
	`source_url` text,
	`source_type` text,
	`scraped_at` text,
	`pricing_model` text,
	`rent_per_person` real
);
--> statement-breakpoint
CREATE INDEX `idx_listings_property` ON `listings` (`property_id`);--> statement-breakpoint
CREATE TABLE `listings_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`listing_id` text NOT NULL,
	`property_id` text NOT NULL,
	`snapshot_date` text NOT NULL,
	`base_rent` real
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_history_listing_date` ON `listings_history` (`listing_id`,`snapshot_date`);--> statement-breakpoint
CREATE INDEX `idx_history_property` ON `listings_history` (`property_id`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`norm_name` text NOT NULL,
	`website_url` text,
	`address` text,
	`place_id` text,
	`google_name` text,
	`google_rating` real,
	`google_rating_count` integer,
	`lat` real,
	`lng` real,
	`zone` text,
	`zone_override` text,
	`distance_to_campus_mi` real,
	`is_core` integer DEFAULT 0 NOT NULL,
	`amenities_summary` text,
	`amenities_highlights` text,
	`amenities_notable_gaps` text,
	`features` text,
	`features_flat` text,
	`photos` text,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_properties_norm_name` ON `properties` (`norm_name`);--> statement-breakpoint
CREATE TABLE `saved_charts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` integer,
	`title` text NOT NULL,
	`chart_spec` text NOT NULL,
	`created_at` integer
);
--> statement-breakpoint
CREATE TABLE `stats_cache` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scope` text NOT NULL,
	`property_id` text,
	`zone` text,
	`bed_count` integer,
	`metric` text NOT NULL,
	`value` real,
	`n` integer DEFAULT 0 NOT NULL,
	`meta` text,
	`computed_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_stats` ON `stats_cache` (`scope`,`property_id`,`zone`,`bed_count`,`metric`);--> statement-breakpoint
CREATE INDEX `idx_stats_property` ON `stats_cache` (`property_id`);--> statement-breakpoint
CREATE TABLE `student_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text,
	`raw_hood` text NOT NULL,
	`match_method` text NOT NULL,
	`match_score` real,
	`layout_raw` text,
	`beds` integer,
	`baths` real,
	`rent_reported` real,
	`rent_per_person` real,
	`double_occupancy` integer DEFAULT 0 NOT NULL,
	`is_own_place` integer DEFAULT 0 NOT NULL,
	`utils_included` integer DEFAULT 0 NOT NULL,
	`utility_cost` real,
	`parking` integer DEFAULT 0 NOT NULL,
	`parking_cost` real,
	`signing_month` text,
	`signing_year` integer,
	`signing_date` text,
	`note` text,
	`note_raw` text,
	`sentiment` real,
	`outlier_flag` integer DEFAULT 0 NOT NULL,
	`basis_flag` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_reports_property` ON `student_reports` (`property_id`);--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text,
	`raw_building` text NOT NULL,
	`complaints` text,
	`complaint_other` text,
	`maintenance_rating` integer,
	`maintenance_note` text,
	`elevator_count` integer,
	`elevator_uptime` real,
	`quality` text,
	`created_at` integer
);
--> statement-breakpoint
CREATE INDEX `idx_surveys_property` ON `surveys` (`property_id`);--> statement-breakpoint
CREATE TABLE `unmatched_names` (
	`norm_name` text PRIMARY KEY NOT NULL,
	`raw_name` text NOT NULL,
	`sources` text,
	`best_candidate_id` text,
	`best_score` real,
	`status` text DEFAULT 'pending' NOT NULL
);
