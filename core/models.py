from django.db import models


class Inspiration(models.Model):
    """Inspiration model for storing insights from various sources"""
    title = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    source_type = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'inspiration'
    
    def __str__(self):
        return f"{self.title} - {self.date.strftime('%Y-%m-%d')}"

