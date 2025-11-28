async function getUsers() {
  const rep = await fetch("/api/users");

  const users = await rep.json();

  console.log(users);
}

getUsers();
