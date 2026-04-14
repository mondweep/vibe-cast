FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY agents/FinabeoMarketingAgent/FinabeoMarketingAgent.csproj agents/FinabeoMarketingAgent/
COPY agents/FinabeoMarketingAgent.Api/FinabeoMarketingAgent.Api.csproj agents/FinabeoMarketingAgent.Api/
RUN dotnet restore agents/FinabeoMarketingAgent.Api/FinabeoMarketingAgent.Api.csproj

COPY agents/FinabeoMarketingAgent/ agents/FinabeoMarketingAgent/
COPY agents/FinabeoMarketingAgent.Api/ agents/FinabeoMarketingAgent.Api/
RUN dotnet publish agents/FinabeoMarketingAgent.Api/FinabeoMarketingAgent.Api.csproj \
    -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./
COPY branding/ ./branding/

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "FinabeoMarketingAgent.Api.dll"]
