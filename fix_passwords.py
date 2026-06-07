import pymongo, bcrypt

uri = 'mongodb+srv://serramaradmin:Johndoe%4017@cluster0.4bu6lo6.mongodb.net/serramar?retryWrites=true&w=majority&appName=Cluster0'
c = pymongo.MongoClient(uri, serverSelectionTimeoutMS=10000)
db = c.get_default_database()
users = db['users']

updates = {
    'kristian': ('KRYSTIAN2026', 'KRYSTIAN'),
    'viorica': ('VIORICA2026', 'VIORICA'),
    'rogregeze': ('RODRIGO2026', 'RODRIGO'),
}

for username, (password, realname) in updates.items():
    h = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()
    r = users.update_one({'username': username}, {'$set': {'password': h, 'realName': realname}})
    match = bcrypt.checkpw(password.encode(), h.encode())
    print(f'{username}: updated={r.modified_count} match={match} name={realname}')

# Verify admin
admin = users.find_one({'username': 'admin'})
print(f"admin: name={admin.get('realName','?')} exists={bool(admin)}")

c.close()
print('Done!')
