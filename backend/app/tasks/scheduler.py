"""
Monthly Usage Reset Scheduler
Resets monthly_usage counters on the 1st of every month
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import text
from datetime import datetime
import asyncio

from app.core.database import async_session_maker


class MonthlyResetScheduler:
    """Scheduler for monthly usage reset"""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._setup_jobs()
    
    def _setup_jobs(self):
        """Setup scheduled jobs"""
        # Run on the 1st of every month at 00:00 UTC
        self.scheduler.add_job(
            self.reset_monthly_usage,
            CronTrigger(day=1, hour=0, minute=0),
            id="reset_monthly_usage",
            name="Reset monthly usage counters",
            replace_existing=True,
        )
        
        # Optional: Add a health check job that runs daily
        self.scheduler.add_job(
            self.health_check,
            CronTrigger(hour=0, minute=0),
            id="scheduler_health_check",
            name="Scheduler health check",
            replace_existing=True,
        )
    
    async def reset_monthly_usage(self):
        """
        Reset monthly_usage for all users and API keys
        
        This job runs on the 1st of every month at 00:00 UTC
        """
        try:
            print(f"[Scheduler] Starting monthly usage reset at {datetime.utcnow()}")
            
            async with async_session_maker() as db:
                # Reset users monthly_usage
                user_result = await db.execute(
                    text("""
                        UPDATE users 
                        SET monthly_usage = 0, 
                            last_reset_at = :reset_time
                        WHERE monthly_usage > 0
                    """),
                    {"reset_time": datetime.utcnow()}
                )
                users_reset = user_result.rowcount
                
                # Reset API keys monthly_usage
                # This will be uncommented when API Key table is created
                api_key_result = await db.execute(
                    text("""
                        UPDATE api_keys 
                        SET monthly_usage = 0, 
                            last_reset_at = :reset_time
                        WHERE monthly_usage > 0
                    """),
                    {"reset_time": datetime.utcnow()}
                )
                api_keys_reset = api_key_result.rowcount
                
                await db.commit()
                
                print(f"[Scheduler] Monthly usage reset complete:")
                print(f"  - Users reset: {users_reset}")
                print(f"  - API keys reset: {api_keys_reset}")
                print(f"  - Timestamp: {datetime.utcnow()}")
                
        except Exception as e:
            print(f"[Scheduler] Error during monthly usage reset: {e}")
            import traceback
            traceback.print_exc()
    
    async def health_check(self):
        """Daily health check to ensure scheduler is running"""
        try:
            print(f"[Scheduler] Health check - Scheduler is running at {datetime.utcnow()}")
            
            # Get next run times for all jobs
            jobs = self.scheduler.get_jobs()
            for job in jobs:
                next_run = job.next_run_time
                print(f"  - Job '{job.name}' next run: {next_run}")
                
        except Exception as e:
            print(f"[Scheduler] Health check error: {e}")
    
    def start(self):
        """Start the scheduler"""
        if not self.scheduler.running:
            self.scheduler.start()
            print("[Scheduler] Monthly reset scheduler started")
            
            # Print next run times
            jobs = self.scheduler.get_jobs()
            for job in jobs:
                next_run = job.next_run_time
                print(f"  - {job.name}: next run at {next_run}")
    
    def shutdown(self):
        """Shutdown the scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            print("[Scheduler] Monthly reset scheduler stopped")


# Global scheduler instance
_scheduler_instance = None


def get_scheduler() -> MonthlyResetScheduler:
    """Get or create the global scheduler instance"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = MonthlyResetScheduler()
    return _scheduler_instance


async def test_reset_job():
    """
    Test function to manually trigger a reset
    Useful for testing without waiting for the scheduled time
    """
    scheduler = get_scheduler()
    await scheduler.reset_monthly_usage()


# For manual testing in development
if __name__ == "__main__":
    async def main():
        print("Testing monthly reset job...")
        await test_reset_job()
        print("Test complete!")
    
    asyncio.run(main())
