# Mostly copied from https://pypi.org/project/remote-sqlite/ but accepts a filesystem, to make tracking s3 queries easier.

import sqlite3

import fs
import fs.base
import fs.copy


class RemoteSqlite:
    def __init__(self, remote_fs: fs.base.FS, filename: str, always_download=False):
        self.fsfilename = filename
        self.remote_fs = remote_fs
        self.temp_fs = fs.open_fs("osfs:///tmp")
        self.localpath = self.pull(always_download)
        self.con = sqlite3.connect(self.localpath, detect_types=sqlite3.PARSE_DECLTYPES)
        self.con.row_factory = sqlite3.Row

    def __del__(self):
        self.con.close()

    def pull(self, always_download=False):
        if always_download:
            fs.copy.copy_file(
                self.remote_fs, self.fsfilename, self.temp_fs, self.fsfilename
            )
        else:
            fs.copy.copy_file_if_newer(
                self.remote_fs, self.fsfilename, self.temp_fs, self.fsfilename
            )
        return self.temp_fs.getsyspath(self.fsfilename)

    def push(self, always_upload=False):
        if always_upload:
            fs.copy.copy_file(
                self.temp_fs, self.fsfilename, self.remote_fs, self.fsfilename
            )
        else:
            fs.copy.copy_file_if_newer(
                self.temp_fs, self.fsfilename, self.remote_fs, self.fsfilename
            )

    def get_count(self, tbl_name):
        return self.select(f"""SELECT COUNT(*) FROM `{tbl_name}`""")[0]["COUNT(*)"]

    def get_counts(self):
        tables = self.select(
            """SELECT tbl_name FROM sqlite_master WHERE type='table'"""
        )
        return [{t["tbl_name"]: self.get_count(t["tbl_name"])} for t in tables]

    def select(self, select_statement="SELECT * FROM sqlite_master"):
        cur = self.con.cursor()
        cur.execute(select_statement)
        records = [dict(row) for row in cur.fetchall()]
        return records

    def insert(self, tbl_name, records):
        cur = self.con.cursor()
        for record in records:
            field_names = ",".join([f'"{k}"' for k in record.keys()])
            placeholders = ",".join(["?" for k in record.keys()])
            insert_statement = (
                f'INSERT INTO "{tbl_name}" ({field_names}) VALUES ({placeholders})'
            )
            values = tuple(record.values())
            cur.execute(insert_statement, values)
        self.con.commit()

    def generate_create_table(self, tbl_name, records):
        columns = ", ".join([f'"{k}" TEXT' for k in records[0].keys()])
        return f'CREATE TABLE "{tbl_name}" ({columns})'
