def foo():
    print 'hello world!'

for i in range(5):
    foo()
    print "Sleeping $i"
    System.Threading.Thread.Sleep(1s)
