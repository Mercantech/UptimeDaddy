FROM ruby:3.3

WORKDIR /app

RUN apt-get update && apt-get install -y curl ca-certificates tzdata

COPY Gemfile Gemfile.lock ./

RUN bundle install

COPY . .

CMD ["ruby", "main.rb"]