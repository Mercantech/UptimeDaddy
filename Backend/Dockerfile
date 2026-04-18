FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY . .

RUN dotnet restore "UptimeDaddy.API/UptimeDaddy.API/UptimeDaddy.API.csproj"
RUN dotnet publish "UptimeDaddy.API/UptimeDaddy.API/UptimeDaddy.API.csproj" -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "UptimeDaddy.API.dll"]