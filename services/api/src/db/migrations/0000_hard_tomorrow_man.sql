CREATE TABLE "approval_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"share_link_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"action" varchar(30) NOT NULL,
	"client_note" text,
	"client_ip" varchar(45),
	"client_ua" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_previews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"size" varchar(10) NOT NULL,
	"storage_key" text NOT NULL,
	"width_px" integer,
	"height_px" integer,
	"file_type" varchar(50),
	"size_bytes" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "uniq_asset_size" UNIQUE("asset_id","size")
);
--> statement-breakpoint
CREATE TABLE "asset_tags" (
	"asset_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"added_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "asset_tags_asset_id_tag_id_pk" PRIMARY KEY("asset_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "asset_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"size_bytes" bigint NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_asset_version" UNIQUE("asset_id","version_number")
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"collection_id" uuid,
	"name" varchar(500) NOT NULL,
	"description" text,
	"file_type" varchar(100),
	"extension" varchar(20),
	"size_bytes" bigint NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"storage_key" text NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'processing' NOT NULL,
	"approval_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"blur_hash" text,
	"uploaded_by" uuid NOT NULL,
	"last_accessed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"path" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"request_path" varchar(500) NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"asset_id" uuid,
	"share_link_id" uuid,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"bullmq_job_id" varchar(255),
	"status" varchar(30) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"link_type" varchar(20) NOT NULL,
	"asset_id" uuid,
	"collection_id" uuid,
	"created_by" uuid NOT NULL,
	"password_hash" text,
	"permission" varchar(20) DEFAULT 'view' NOT NULL,
	"is_whatsapp" boolean DEFAULT false NOT NULL,
	"single_use" boolean DEFAULT false NOT NULL,
	"access_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"payment_method" varchar(50),
	"currency" varchar(10) DEFAULT 'UGX' NOT NULL,
	"amount" integer,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"external_ref" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_workspace_id_unique" UNIQUE("workspace_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_workspace_tag" UNIQUE("workspace_id","name")
);
--> statement-breakpoint
CREATE TABLE "upload_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum" varchar(64),
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uniq_session_chunk" UNIQUE("session_id","chunk_index")
);
--> statement-breakpoint
CREATE TABLE "upload_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_id" uuid NOT NULL,
	"idempotency_key" varchar(64) NOT NULL,
	"filename" varchar(500) NOT NULL,
	"file_type" varchar(100),
	"total_size_bytes" bigint NOT NULL,
	"chunk_size_bytes" integer DEFAULT 524288 NOT NULL,
	"total_chunks" integer NOT NULL,
	"uploaded_chunks" integer DEFAULT 0 NOT NULL,
	"storage_key" text,
	"status" varchar(30) DEFAULT 'in_progress' NOT NULL,
	"collection_id" uuid,
	"expires_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "upload_sessions_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"authhub_user_id" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"avatar_url" text,
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"invited_by" uuid,
	"joined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "uniq_workspace_user" UNIQUE("workspace_id","authhub_user_id")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"authhub_tenant_id" varchar(255) NOT NULL,
	"authhub_client_id" varchar(255) NOT NULL,
	"storage_used_bytes" bigint DEFAULT 0 NOT NULL,
	"storage_quota_bytes" bigint DEFAULT 2147483648 NOT NULL,
	"plan" varchar(50) DEFAULT 'free' NOT NULL,
	"logo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug"),
	CONSTRAINT "workspaces_authhub_tenant_id_unique" UNIQUE("authhub_tenant_id")
);
--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_previews" ADD CONSTRAINT "asset_previews_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_added_by_workspace_members_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_uploaded_by_workspace_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_workspace_members_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_workspace_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_member_id_workspace_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_member_id_workspace_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_share_link_id_share_links_id_fk" FOREIGN KEY ("share_link_id") REFERENCES "public"."share_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_workspace_members_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_chunks" ADD CONSTRAINT "upload_chunks_session_id_upload_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."upload_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_member_id_workspace_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."workspace_members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_sessions" ADD CONSTRAINT "upload_sessions_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_approval_events_asset" ON "approval_events" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_approval_events_link" ON "approval_events" USING btree ("share_link_id");--> statement-breakpoint
CREATE INDEX "idx_previews_asset" ON "asset_previews" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_tags_asset" ON "asset_tags" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_tags_tag" ON "asset_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "idx_versions_asset" ON "asset_versions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_assets_workspace" ON "assets" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_assets_collection" ON "assets" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_assets_status" ON "assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_assets_hash" ON "assets" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_assets_last_accessed" ON "assets" USING btree ("last_accessed_at");--> statement-breakpoint
CREATE INDEX "idx_collections_workspace" ON "collections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_collections_parent" ON "collections" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_collections_path" ON "collections" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_idempotency_expires" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_member" ON "notifications" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_asset" ON "processing_jobs" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "processing_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_share_links_token" ON "share_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_share_links_workspace" ON "share_links" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_share_links_expires" ON "share_links" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_key" ON "upload_sessions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_upload_sessions_member" ON "upload_sessions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_members_workspace" ON "workspace_members" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "idx_members_user" ON "workspace_members" USING btree ("authhub_user_id");--> statement-breakpoint
CREATE INDEX "idx_workspaces_slug" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_workspaces_tenant" ON "workspaces" USING btree ("authhub_tenant_id");