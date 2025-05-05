import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

class EmailService:
    def __init__(self):
        self.smtp_server = "smtp.gmail.com"
        self.smtp_port = 587
        self.sender_email = "layashreya7@gmail.com"
        self.password = "hxhr hbdf okjl hham"  # Replace with Gmail App Password

    def send_survey_notification(self, recipient_email: str, title: str, form_url: str):
        msg = MIMEMultipart()
        msg['From'] = self.sender_email
        msg['To'] = recipient_email
        msg['Subject'] = f"New Survey: {title}"
        body = f"Please complete the survey: {form_url}"
        msg.attach(MIMEText(body, 'plain'))

        try:
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.password)
                server.send_message(msg)
        except Exception as e:
            raise Exception(f"Failed to send email: {str(e)}")