import os
import stat

path = 'AlNoor_Financial_Summary_January_2026.xlsx'
print('Exists:', os.path.exists(path))
if os.path.exists(path):
    print('Is file:', os.path.isfile(path))
    st = os.stat(path)
    print('Perms:', oct(st.st_mode))
    try:
        os.remove(path)
        print('Deleted successfully')
    except Exception as e:
        print('Error deleting:', e)
else:
    print('File does not exist.')
