from django.db import models


class Note(models.Model):
    """Note model matching the existing PostgreSQL table"""
    title = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    note = models.TextField()
    media_type = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'note'  # Use existing table name
    
    def __str__(self):
        return f"{self.title} - {self.date.strftime('%Y-%m-%d')}"

