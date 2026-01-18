#!/usr/bin/env runhaskell
-- ASCII苹果绘制程序
-- 作者：审理零花的狗

module Main where

import System.Environment (getArgs)

-- ASCII苹果艺术
appleArt :: String
appleArt = unlines [
    "          .:",
    "        :' :,",
    "       :: :'",
    "        :l:",
    "       ;l ;:",
    "      ;l ;l:",
    "     ;l  ll:",
    "    ;l   ll:",
    "   ;l    ll:",
    "  ;l     ll:",
    " ;l      ll:",
    ";l_______ll:",
    " |       |",
    " |_______|"
    ]

-- 简单版ASCII苹果
simpleApple :: String
simpleApple = unlines [
    "       .:",
    "     :' :",
    "    :: :",
    "     l:",
    "    l l:",
    "   l  l:",
    "  l___l:",
    "  |   |",
    "  |___|"
    ]

-- 带叶子的苹果
appleWithLeaf :: String
appleWithLeaf = unlines [
    "          .::",
    "        .'  ::",
    "       .'    ::",
    "      .'      ::",
    "     .'  .:'   ::",
    "    .'  :'     ::",
    "   .'  :'      ::",
    "  .'  :'       ::",
    " .'  :'        ::",
    " ::  :'        ::",
    "  :::'__________::",
    "   |  |",
    "   |__|"
    ]

-- 显示用法信息
showUsage :: IO ()
showUsage = putStrLn $ unlines [
    "用法: ascii_apple [选项]",
    "",
    "选项:",
    "  --simple     显示简单版苹果",
    "  --leaf       显示带叶子的苹果",
    "  --help       显示此帮助信息",
    "",
    "默认显示标准版苹果"
    ]

-- 主函数
main :: IO ()
main = do
    args <- getArgs
    case args of
        ["--simple"] -> putStrLn simpleApple
        ["--leaf"]   -> putStrLn appleWithLeaf
        ["--help"]   -> showUsage
        []           -> putStrLn appleArt
        _            -> do
            putStrLn "未知选项，使用 --help 查看帮助"
            showUsage
