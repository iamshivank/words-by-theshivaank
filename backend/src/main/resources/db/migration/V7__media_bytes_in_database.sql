-- Image bytes live in the database, so uploads survive on hosts without a persistent disk
-- (Render's free tier, for example). Rows created before this migration keep data = NULL and are
-- still served from UPLOAD_DIR when the file exists there.
ALTER TABLE media ADD COLUMN data bytea;
