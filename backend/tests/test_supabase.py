from app.core.supabase import supabase


response = supabase.table("doctors").select("id").limit(1).execute()

print("Supabase connection successful")
print(response.data)