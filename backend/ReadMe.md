***Redis cmd***
**This is for delete Redis data using git bash**
winpty docker exec -it url-shortener-redis redis-cli FLUSHALL

**After delete check cmd**
winpty docker exec -it url-shortener-redis redis-cli DBSIZE


***Delete data from DB***
**For connect to db**
winpty docker exec -it url-shortener-postgres psql -U postgres -d url_shortener

**Then check your tables:**
/dt

**Delete data but keep tables TRUNCATE will only delete data inside table**
TRUNCATE TABLE urls, users RESTART IDENTITY CASCADE;

**Then verify:**
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM urls;