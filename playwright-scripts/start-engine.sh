#!/bin/bash
ORIG=$(pwd)

if [ -d ~/.engine -a -d ~/.engine/.git ]; then
  echo "Pulling latest engine updates..."
  cd ~/.engine
  git checkout devel
  git pull origin devel
else
  echo "Downloading engine..."
  git clone https://github.com/Lumeer/engine.git ~/.engine
  cd ~/.engine
  git checkout devel
fi

chmod +w ./lumeer-core/src/main/resources/defaults-dev.properties
sed -i '' "s/admin_user_emails=aturing@lumeer.io/admin_user_emails=$TEST_USER_EMAIL/1" file.txt
echo "Building engine..."
mvn install -DskipTests -DskipITs -B --quiet
cd war

echo "Starting engine..."
rm -rf target/embedmongo
mkdir target/embedmongo
export SKIP_LIMITS=true
mvn -s settings.xml wildfly:run -PstartEngine -B --quiet &
echo $! > $ORIG/engine.pid

echo "Waiting for engine to start..."
while test $(curl -s -o /dev/null -I -w "%{http_code}" http://localhost:8080/lumeer-engine/rest/users) != 401; do
  sleep 10
done
sleep 5

echo "Engine started!"

cd $ORIG
