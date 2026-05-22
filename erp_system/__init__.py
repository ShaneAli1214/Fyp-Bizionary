try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    # PyMySQL not available (development environment)
    pass
