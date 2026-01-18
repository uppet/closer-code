#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ASCII苹果绘制程序
作者：审理零花的狗
"""

import sys

# ASCII苹果艺术
APPLE_ART = """
          .:
        :' :,
       :: :'
        :l:
       ;l ;:
      ;l ;l:
     ;l  ll:
    ;l   ll:
   ;l    ll:
  ;l     ll:
 ;l      ll:
;l_______ll:
 |       |
 |_______|
"""

# 简单版ASCII苹果
SIMPLE_APPLE = """
       .:
     :' :
    :: :
     l:
    l l:
   l  l:
  l___l:
  |   |
  |___|
"""

# 带叶子的苹果
APPLE_WITH_LEAF = """
          .::
        .'  ::
       .'    ::
      .'      ::
     .'  .:'   ::
    .'  :'     ::
   .'  :'      ::
  .'  :'       ::
 .'  :'        ::
 ::  :'        ::
  :::'__________::
   |  |
   |__|
"""


def show_usage():
    """显示用法信息"""
    print("""
用法: ascii_apple.py [选项]

选项:
  --simple     显示简单版苹果
  --leaf       显示带叶子的苹果
  --help       显示此帮助信息

默认显示标准版苹果
    """)


def main():
    """主函数"""
    args = sys.argv[1:]
    
    if "--simple" in args:
        print(SIMPLE_APPLE)
    elif "--leaf" in args:
        print(APPLE_WITH_LEAF)
    elif "--help" in args or "-h" in args:
        show_usage()
    elif len(args) == 0:
        print(APPLE_ART)
    else:
        print("未知选项，使用 --help 查看帮助")
        show_usage()


if __name__ == "__main__":
    main()
