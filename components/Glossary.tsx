import { Link } from "@mui/material";
import React from "react";

function TermsAndConcepts() {
  return (
    <div>
      <h2>Terms and Concepts</h2>

      <h3>Natural Transformation</h3>
      <p>
        A natural transformation is a mapping between functors that preserves
        the structure of the underlying categories. —{" "}
        <cite>
          Bartosz Milewski from{" "}
          <Link href="https://www.fpcomplete.com/user/bartosz/understanding-yoneda">
            Understanding Yoneda
          </Link>
        </cite>
      </p>
      <p>
        This is a case where definitions are confusing, but the actual thing is
        quite simple in practice. Let's try that out in Scala using the Functors{" "}
        <code>List</code> and <code>Option</code>.
      </p>
      <pre>
        <code>
          {`val someString: Option[String] = Some("foo")
val noneString: Option[String] = None

// We can intuitively think of Option as being a List of 0 or 1 elements, so the
// natural transformation is trivial (note: I'm intentionally avoiding the use
// of Scala's own .toList):
def optionToList[A](a: Option[A]): List[A] =
  a.map(x => List(x)).getOrElse(List.empty[A])

optionToList(someString)
//=> res: List[String] = List(foo)

optionToList(noneString)
//=> res: List[String] = List()

optionToList(None)
//=> res: List[Nothing] = List()`}
        </code>
      </pre>

      {/* Next section */}
      <h3>Isomorphism</h3>
      <p>
        In mathematics, an isomorphism (from the Greek: isos "equal", and morphe
        "shape") is a homomorphism (or more generally a morphism){" "}
        <strong>that admits an inverse</strong>. Two mathematical objects are
        isomorphic if an isomorphism exists between them. —{" "}
        <cite>
          <Link href="http://en.wikipedia.org/wiki/Isomorphism">Wikipedia</Link>
        </cite>
      </p>
      <p>
        Now the Scala in which we'll describe the world's most trivial
        isomorphism:
      </p>
      <pre>
        <code>
          {`// These two objects are isomorphic because a morphism (i.e. function) exists
// that maps each to the other.
val nameAge = ("foo", 42)
val ageName = (42, "foo")

def tuple2Iso[A, B](p: (A, B)): (B, A) = (p._2, p._1)

// A => B
tuple2Iso(nameAge) == ageName
//=> true

// B => A
tuple2Iso(ageName) == nameAge
//=> true

tuple2Iso(tuple2Iso(nameAge)) == nameAge
//=> true`}
        </code>
      </pre>

      {/* Next section */}
      <h3>Domain and Codomain</h3>
      <p>
        Domains come from set theory, and represent the set of input values for
        a function, while codomains represent the set of output values.
        Therefore, a function is the mapping between its domain and codomain.
      </p>
      <p>
        In programming, types and domains are related but not quite the same.
        Domains are strictly related to functions, while a type specifies a set
        of values.
      </p>
      {/* Continue with the content */}

      {/* Next section */}
      <h3>Existential types</h3>
      <p>
        Read{" "}
        <Link href="https://www.haskell.org/haskellwiki/Existential_type">
          Existential type
        </Link>{" "}
        on the HaskellWiki.
      </p>
      <p>
        Existential types provide a way of baking the generics into a type
        instead of explicitly declaring them. Consider the ultra-contrived
        example where we have a type <code>Things</code> which contains a list
        of stuff whose type we don't care about because the only operation we
        want to perform on it is to count how many there are.
      </p>
      <pre>
        <code>
          {`case class Things[A](list: List[A])
val intThings: Things[Int] = Things(List(1, 2, 3))
def count[A](ts: Things[A]) = ts.list.size
count(intThings)
//=> 3`}
        </code>
      </pre>

      {/* Next section */}
      <h3>Rank-1 Polymorphic Function</h3>
      <p>
        An example based on
        <Link href="https://apocalisp.wordpress.com/2010/07/02/higher-rank-polymorphism-in-scala/">
          Higher-Rank Polymorphism in Scala
        </Link>
        :
      </p>
      <pre>
        <code>
          {`def r1[A](f: A => A, a: A): A = f(a)
r1({ i: Int => i * i }, 10)
// res4: Int = 100`}
        </code>
      </pre>

      {/* Next section */}
      <h3>Rank-2 Polymorphic Function</h3>
      <p>
        Again from
        <Link href="https://apocalisp.wordpress.com/2010/07/02/higher-rank-polymorphism-in-scala/">
          Higher-Rank Polymorphism in Scala
        </Link>
        :
      </p>
      <pre>
        <code>
          {`trait ~>[F[_],G[_]] {
  def apply[A](a: F[A]): G[A]
}`}
        </code>
      </pre>

      {/* Next section */}
      <h3>Parametricity</h3>
      <p>
        <blockquote>
          captures the intuition that all instances of a polymorphic function
          act the same way —{" "}
          <cite>
            <Link href="https://en.wikipedia.org/wiki/Parametricity">
              Wikipedia
            </Link>
          </cite>
        </blockquote>
      </p>

      {/* Next section */}
      <h3>Partial Function</h3>
      <p>A function which is not defined for some inputs.</p>

      {/* Next section */}
      <h3>Total Function</h3>
      <p>
        A function which is defined for all inputs, as opposed to a partial
        function.
      </p>

      {/* Next section */}
      <h3>Extensionality and Intensionality</h3>
      <p>
        In logic, extensionality, or extensional equality, refers to principles
        that judge objects to be equal if they have the same external
        properties. It stands in contrast to the concept of intensionality,
        which is concerned with whether the internal definitions of objects are
        the same. —{" "}
        <cite>
          <Link href="http://en.wikipedia.org/wiki/Extensionality">
            Wikipedia
          </Link>
        </cite>
      </p>
      <pre>
        <code>
          {`f :: Int -> Int
f x = x + x + x

g :: Int -> Int
g x = x * 3

-- f and g are extensionally equal but not intensionally equal.

h :: Int -> Int
h x = x + x + x

-- f and h are intensionally equal.`}
        </code>
      </pre>
    </div>
  );
}

export default TermsAndConcepts;
