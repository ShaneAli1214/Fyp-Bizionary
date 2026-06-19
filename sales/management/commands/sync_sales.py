from django.core.management.base import BaseCommand
from sales.services import SalesImportService

class Command(BaseCommand):
    help = 'Sync sales records from Excel files in the output/ folder'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-importing of all files, even if already imported',
        )

    def handle(self, *args, **options):
        force = options['force']
        self.stdout.write(self.style.NOTICE(f"Starting Excel sales sync (force={force})..."))
        
        result = SalesImportService.sync_monthly_sales_files(force=force)
        
        if not result['success']:
            self.stdout.write(self.style.ERROR(f"Error: {result.get('error')}"))
            return
            
        for detail in result.get('details', []):
            status = detail['status']
            filename = detail['filename']
            if status == 'SUCCESS':
                self.stdout.write(self.style.SUCCESS(
                    f"OK {filename}: Imported {detail['created_records']} rows "
                    f"(deleted {detail['deleted_previous']} old, skipped {detail['skipped_zero_quantity']} zero-qty)"
                ))
            elif status == 'SKIPPED':
                self.stdout.write(self.style.WARNING(f"SKIP {filename}: {detail['message']}"))
            else:
                self.stdout.write(self.style.ERROR(f"FAIL {filename}: {detail.get('message')}"))
                
        self.stdout.write(self.style.SUCCESS(f"Finished. Total created: {result.get('total_created')}"))
