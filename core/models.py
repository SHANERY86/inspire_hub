from django.db import models


class Inspiration(models.Model):
    """Inspiration model for storing insights from various sources"""
    source_title = models.CharField(max_length=255)
    essence = models.CharField(max_length=255)
    date = models.DateTimeField(auto_now_add=True)
    content = models.TextField()
    source_type = models.CharField(max_length=50)
    
    class Meta:
        db_table = 'inspiration'
    
    def __str__(self):
        return f"{self.essence} - {self.date.strftime('%Y-%m-%d')}"


class Screenshot(models.Model):
    """Screenshot model for storing images attached to inspirations"""
    inspiration = models.ForeignKey(
        Inspiration, 
        on_delete=models.CASCADE, 
        related_name='screenshots'
    )
    image = models.ImageField(upload_to='screenshots/')
    extracted_text = models.TextField(blank=True, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'screenshot'
    
    def __str__(self):
        return f"Screenshot for {self.inspiration.essence}"

