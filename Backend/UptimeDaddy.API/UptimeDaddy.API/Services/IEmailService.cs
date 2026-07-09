namespace UptimeDaddy.API.Services;

public interface IEmailService
{
    bool IsConfigured { get; }

    Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
